-- Slowgres Schema Migration
-- Designed for Supabase / PostgreSQL with Row Level Security (RLS) enabled on every table.

-- 1. Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Memberships table (Maps authenticated users to organizations)
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- references auth.users(id) in Supabase
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_membership_org_user UNIQUE (org_id, user_id)
);

-- Index for fast user organization lookups
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.memberships (user_id);

-- 3. Subscriptions table (Groundwork for Phase 6 monetization; defaults to 'free')
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete')),
    provider TEXT NOT NULL DEFAULT 'manual', -- e.g., 'paddle', 'lemonsqueezy', 'manual'
    provider_customer_id TEXT,
    provider_subscription_id TEXT,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for instant subscription status resolution during entitlement checks
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON public.subscriptions (org_id);

-- 4. Analyses table (Stores original SQL, JSON execution plan, and timings)
CREATE TABLE IF NOT EXISTS public.analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL, -- references auth.users(id)
    query_text TEXT,
    plan_json JSONB NOT NULL,
    total_time_ms DOUBLE PRECISION NOT NULL,
    planning_time_ms DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for paginated history queries ordered by most recent analyses within an organization
CREATE INDEX IF NOT EXISTS idx_analyses_org_created_at ON public.analyses (org_id, created_at DESC);

-- 5. Findings table (Normalized findings produced by the rules engine)
CREATE TABLE IF NOT EXISTS public.findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
    rule_id TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    node_path TEXT NOT NULL,
    title TEXT NOT NULL,
    explanation TEXT NOT NULL,
    suggestion TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for retrieving all findings associated with a specific query analysis
CREATE INDEX IF NOT EXISTS idx_findings_analysis_id ON public.findings (analysis_id);

-- 6. Usage Events table (Tracks daily query analysis consumption per org)
CREATE TABLE IF NOT EXISTS public.usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL DEFAULT 'analysis_run',
    event_date DATE NOT NULL DEFAULT CURRENT_DATE,
    count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_org_event_date UNIQUE (org_id, event_type, event_date)
);

-- Index for checking daily quota consumption during entitlement gating
CREATE INDEX IF NOT EXISTS idx_usage_events_org_date ON public.usage_events (org_id, event_type, event_date);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) CONFIGURATION
-- ============================================================================

-- Helper security definer function to verify if the authenticated caller belongs to the organization
CREATE OR REPLACE FUNCTION public.user_is_org_member(org_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.memberships
        WHERE org_id = org_uuid
          AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Enable RLS on every table
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- 1. Organizations Policies
CREATE POLICY "Users can view organizations they belong to"
    ON public.organizations FOR SELECT
    USING (public.user_is_org_member(id));

-- 2. Memberships Policies
CREATE POLICY "Users can view memberships within their organizations"
    ON public.memberships FOR SELECT
    USING (user_id = auth.uid() OR public.user_is_org_member(org_id));

-- 3. Subscriptions Policies
CREATE POLICY "Org members can view their organization's subscription"
    ON public.subscriptions FOR SELECT
    USING (public.user_is_org_member(org_id));

-- 4. Analyses Policies
CREATE POLICY "Org members can view analyses"
    ON public.analyses FOR SELECT
    USING (public.user_is_org_member(org_id));

CREATE POLICY "Org members can create analyses"
    ON public.analyses FOR INSERT
    WITH CHECK (public.user_is_org_member(org_id) AND created_by = auth.uid());

CREATE POLICY "Org members can delete analyses"
    ON public.analyses FOR DELETE
    USING (public.user_is_org_member(org_id));

-- 5. Findings Policies
CREATE POLICY "Org members can view findings for their analyses"
    ON public.findings FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.analyses a
        WHERE a.id = findings.analysis_id
          AND public.user_is_org_member(a.org_id)
    ));

CREATE POLICY "Org members can insert findings for their analyses"
    ON public.findings FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.analyses a
        WHERE a.id = findings.analysis_id
          AND public.user_is_org_member(a.org_id)
    ));

CREATE POLICY "Org members can delete findings for their analyses"
    ON public.findings FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.analyses a
        WHERE a.id = findings.analysis_id
          AND public.user_is_org_member(a.org_id)
    ));

-- 6. Usage Events Policies
CREATE POLICY "Org members can view their usage events"
    ON public.usage_events FOR SELECT
    USING (public.user_is_org_member(org_id));

-- Auto-provision free subscription trigger on organization creation
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.subscriptions (org_id, plan, status, provider)
    VALUES (NEW.id, 'free', 'active', 'manual')
    ON CONFLICT (org_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_on_org_created_provision_subscription
    AFTER INSERT ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_organization();
