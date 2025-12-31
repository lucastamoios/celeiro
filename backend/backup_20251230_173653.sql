--
-- PostgreSQL database dump
--

\restrict nQNpE3UxVb4aXipACkHJYoBhoKhePmFkwdrnmtw6cX75h5V6hMcBCdpKhOFVnIo

-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.accounts (
    account_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer NOT NULL,
    organization_id integer NOT NULL,
    name character varying(255) NOT NULL,
    account_type character varying(50) NOT NULL,
    bank_name character varying(255),
    balance numeric(15,2) DEFAULT 0.00,
    currency character varying(3) DEFAULT 'BRL'::character varying,
    is_active boolean DEFAULT true
);


ALTER TABLE public.accounts OWNER TO celeiro_user;

--
-- Name: accounts_account_id_seq; Type: SEQUENCE; Schema: public; Owner: celeiro_user
--

CREATE SEQUENCE public.accounts_account_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.accounts_account_id_seq OWNER TO celeiro_user;

--
-- Name: accounts_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: celeiro_user
--

ALTER SEQUENCE public.accounts_account_id_seq OWNED BY public.accounts.account_id;


--
-- Name: patterns; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.patterns (
    pattern_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id integer NOT NULL,
    organization_id integer NOT NULL,
    description_pattern text NOT NULL,
    date_pattern text,
    weekday_pattern text,
    amount_min numeric(15,2),
    amount_max numeric(15,2),
    target_description text NOT NULL,
    target_category_id integer NOT NULL,
    apply_retroactively boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT valid_amount_range CHECK ((((amount_min IS NULL) AND (amount_max IS NULL)) OR ((amount_min IS NOT NULL) AND (amount_max IS NOT NULL) AND (amount_min <= amount_max))))
);


ALTER TABLE public.patterns OWNER TO celeiro_user;

--
-- Name: advanced_patterns_pattern_id_seq; Type: SEQUENCE; Schema: public; Owner: celeiro_user
--

CREATE SEQUENCE public.advanced_patterns_pattern_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.advanced_patterns_pattern_id_seq OWNER TO celeiro_user;

--
-- Name: advanced_patterns_pattern_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: celeiro_user
--

ALTER SEQUENCE public.advanced_patterns_pattern_id_seq OWNED BY public.patterns.pattern_id;


--
-- Name: budget_items; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.budget_items (
    budget_item_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    budget_id integer NOT NULL,
    category_id integer NOT NULL,
    planned_amount numeric(15,2) NOT NULL,
    CONSTRAINT budget_items_planned_amount_check CHECK ((planned_amount >= (0)::numeric))
);


ALTER TABLE public.budget_items OWNER TO celeiro_user;

--
-- Name: budget_items_budget_item_id_seq; Type: SEQUENCE; Schema: public; Owner: celeiro_user
--

CREATE SEQUENCE public.budget_items_budget_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.budget_items_budget_item_id_seq OWNER TO celeiro_user;

--
-- Name: budget_items_budget_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: celeiro_user
--

ALTER SEQUENCE public.budget_items_budget_item_id_seq OWNED BY public.budget_items.budget_item_id;


--
-- Name: budgets; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.budgets (
    budget_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer NOT NULL,
    organization_id integer NOT NULL,
    name character varying(255) NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    budget_type character varying(20) NOT NULL,
    amount numeric(15,2) DEFAULT 0.00,
    is_active boolean DEFAULT true,
    CONSTRAINT budgets_budget_type_check CHECK (((budget_type)::text = ANY ((ARRAY['fixed'::character varying, 'calculated'::character varying, 'maior'::character varying])::text[]))),
    CONSTRAINT budgets_month_check CHECK (((month >= 1) AND (month <= 12))),
    CONSTRAINT budgets_year_check CHECK (((year >= 2000) AND (year <= 2100)))
);


ALTER TABLE public.budgets OWNER TO celeiro_user;

--
-- Name: budgets_budget_id_seq; Type: SEQUENCE; Schema: public; Owner: celeiro_user
--

CREATE SEQUENCE public.budgets_budget_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.budgets_budget_id_seq OWNER TO celeiro_user;

--
-- Name: budgets_budget_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: celeiro_user
--

ALTER SEQUENCE public.budgets_budget_id_seq OWNED BY public.budgets.budget_id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.categories (
    category_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    name character varying(255) NOT NULL,
    icon character varying(10) DEFAULT '📦'::character varying,
    is_system boolean DEFAULT false,
    user_id integer,
    color character varying(7) DEFAULT '#6B7280'::character varying,
    category_type character varying(20) DEFAULT 'expense'::character varying NOT NULL,
    CONSTRAINT categories_category_type_check CHECK (((category_type)::text = ANY ((ARRAY['expense'::character varying, 'income'::character varying])::text[])))
);


ALTER TABLE public.categories OWNER TO celeiro_user;

--
-- Name: categories_category_id_seq; Type: SEQUENCE; Schema: public; Owner: celeiro_user
--

CREATE SEQUENCE public.categories_category_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_category_id_seq OWNER TO celeiro_user;

--
-- Name: categories_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: celeiro_user
--

ALTER SEQUENCE public.categories_category_id_seq OWNED BY public.categories.category_id;


--
-- Name: category_budgets; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.category_budgets (
    category_budget_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer NOT NULL,
    organization_id integer NOT NULL,
    category_id integer NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    budget_type character varying(20) NOT NULL,
    planned_amount numeric(15,2) DEFAULT 0 NOT NULL,
    is_consolidated boolean DEFAULT false NOT NULL,
    consolidated_at timestamp without time zone,
    CONSTRAINT category_budgets_budget_type_check CHECK (((budget_type)::text = ANY ((ARRAY['fixed'::character varying, 'calculated'::character varying, 'maior'::character varying])::text[]))),
    CONSTRAINT category_budgets_month_check CHECK (((month >= 1) AND (month <= 12))),
    CONSTRAINT category_budgets_planned_amount_check CHECK ((planned_amount >= (0)::numeric)),
    CONSTRAINT category_budgets_year_check CHECK (((year >= 2000) AND (year <= 2100)))
);


ALTER TABLE public.category_budgets OWNER TO celeiro_user;

--
-- Name: category_budgets_category_budget_id_seq; Type: SEQUENCE; Schema: public; Owner: celeiro_user
--

CREATE SEQUENCE public.category_budgets_category_budget_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.category_budgets_category_budget_id_seq OWNER TO celeiro_user;

--
-- Name: category_budgets_category_budget_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: celeiro_user
--

ALTER SEQUENCE public.category_budgets_category_budget_id_seq OWNED BY public.category_budgets.category_budget_id;


--
-- Name: goose_db_version; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.goose_db_version (
    id integer NOT NULL,
    version_id bigint NOT NULL,
    is_applied boolean NOT NULL,
    tstamp timestamp without time zone DEFAULT now()
);


ALTER TABLE public.goose_db_version OWNER TO celeiro_user;

--
-- Name: goose_db_version_id_seq; Type: SEQUENCE; Schema: public; Owner: celeiro_user
--

CREATE SEQUENCE public.goose_db_version_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.goose_db_version_id_seq OWNER TO celeiro_user;

--
-- Name: goose_db_version_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: celeiro_user
--

ALTER SEQUENCE public.goose_db_version_id_seq OWNED BY public.goose_db_version.id;


--
-- Name: monthly_snapshots; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.monthly_snapshots (
    snapshot_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer NOT NULL,
    organization_id integer NOT NULL,
    category_id integer NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    planned_amount numeric(15,2) NOT NULL,
    actual_amount numeric(15,2) NOT NULL,
    variance_percent numeric(5,2),
    budget_type character varying(20) NOT NULL,
    CONSTRAINT monthly_snapshots_month_check CHECK (((month >= 1) AND (month <= 12))),
    CONSTRAINT monthly_snapshots_year_check CHECK (((year >= 2000) AND (year <= 2100)))
);


ALTER TABLE public.monthly_snapshots OWNER TO celeiro_user;

--
-- Name: monthly_snapshots_snapshot_id_seq; Type: SEQUENCE; Schema: public; Owner: celeiro_user
--

CREATE SEQUENCE public.monthly_snapshots_snapshot_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.monthly_snapshots_snapshot_id_seq OWNER TO celeiro_user;

--
-- Name: monthly_snapshots_snapshot_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: celeiro_user
--

ALTER SEQUENCE public.monthly_snapshots_snapshot_id_seq OWNED BY public.monthly_snapshots.snapshot_id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.organizations (
    organization_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    name character varying(255),
    address character varying(255) DEFAULT ''::character varying,
    city character varying(255) DEFAULT ''::character varying,
    state character varying(255) DEFAULT ''::character varying,
    zip character varying(255) DEFAULT ''::character varying,
    country character varying(255) DEFAULT ''::character varying,
    latitude numeric(10,8) DEFAULT 0,
    longitude numeric(11,8) DEFAULT 0
);


ALTER TABLE public.organizations OWNER TO celeiro_user;

--
-- Name: organizations_organization_id_seq; Type: SEQUENCE; Schema: public; Owner: celeiro_user
--

CREATE SEQUENCE public.organizations_organization_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organizations_organization_id_seq OWNER TO celeiro_user;

--
-- Name: organizations_organization_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: celeiro_user
--

ALTER SEQUENCE public.organizations_organization_id_seq OWNED BY public.organizations.organization_id;


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.permissions (
    permission character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.permissions OWNER TO celeiro_user;

--
-- Name: planned_entries; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.planned_entries (
    planned_entry_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer NOT NULL,
    organization_id integer NOT NULL,
    category_id integer NOT NULL,
    description character varying(255) NOT NULL,
    amount numeric(15,2) NOT NULL,
    is_recurrent boolean DEFAULT false NOT NULL,
    parent_entry_id integer,
    expected_day integer,
    is_active boolean DEFAULT true NOT NULL,
    pattern_id integer,
    expected_day_start integer,
    expected_day_end integer,
    amount_min numeric(15,2),
    amount_max numeric(15,2),
    entry_type character varying(20) DEFAULT 'expense'::character varying NOT NULL,
    savings_goal_id integer,
    CONSTRAINT chk_planned_entries_valid_amount_range CHECK ((((amount_min IS NULL) AND (amount_max IS NULL)) OR ((amount_min IS NOT NULL) AND (amount_max IS NOT NULL) AND (amount_min <= amount_max)))),
    CONSTRAINT chk_planned_entries_valid_day_range CHECK ((((expected_day_start IS NULL) AND (expected_day_end IS NULL)) OR ((expected_day_start IS NOT NULL) AND (expected_day_end IS NOT NULL) AND (expected_day_start <= expected_day_end)))),
    CONSTRAINT planned_entries_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT planned_entries_amount_max_check CHECK (((amount_max IS NULL) OR (amount_max >= (0)::numeric))),
    CONSTRAINT planned_entries_amount_min_check CHECK (((amount_min IS NULL) OR (amount_min >= (0)::numeric))),
    CONSTRAINT planned_entries_entry_type_check CHECK (((entry_type)::text = ANY ((ARRAY['expense'::character varying, 'income'::character varying])::text[]))),
    CONSTRAINT planned_entries_expected_day_check CHECK (((expected_day >= 1) AND (expected_day <= 31))),
    CONSTRAINT planned_entries_expected_day_end_check CHECK (((expected_day_end IS NULL) OR ((expected_day_end >= 1) AND (expected_day_end <= 31)))),
    CONSTRAINT planned_entries_expected_day_start_check CHECK (((expected_day_start IS NULL) OR ((expected_day_start >= 1) AND (expected_day_start <= 31))))
);


ALTER TABLE public.planned_entries OWNER TO celeiro_user;

--
-- Name: planned_entries_planned_entry_id_seq; Type: SEQUENCE; Schema: public; Owner: celeiro_user
--

CREATE SEQUENCE public.planned_entries_planned_entry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.planned_entries_planned_entry_id_seq OWNER TO celeiro_user;

--
-- Name: planned_entries_planned_entry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: celeiro_user
--

ALTER SEQUENCE public.planned_entries_planned_entry_id_seq OWNED BY public.planned_entries.planned_entry_id;


--
-- Name: planned_entry_statuses; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.planned_entry_statuses (
    status_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    planned_entry_id integer NOT NULL,
    month integer NOT NULL,
    year integer NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    matched_transaction_id integer,
    matched_amount numeric(15,2),
    matched_at timestamp without time zone,
    dismissed_at timestamp without time zone,
    dismissal_reason text,
    CONSTRAINT planned_entry_statuses_month_check CHECK (((month >= 1) AND (month <= 12))),
    CONSTRAINT planned_entry_statuses_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'matched'::character varying, 'missed'::character varying, 'dismissed'::character varying])::text[]))),
    CONSTRAINT planned_entry_statuses_year_check CHECK (((year >= 2000) AND (year <= 2100)))
);


ALTER TABLE public.planned_entry_statuses OWNER TO celeiro_user;

--
-- Name: planned_entry_statuses_status_id_seq; Type: SEQUENCE; Schema: public; Owner: celeiro_user
--

CREATE SEQUENCE public.planned_entry_statuses_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.planned_entry_statuses_status_id_seq OWNER TO celeiro_user;

--
-- Name: planned_entry_statuses_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: celeiro_user
--

ALTER SEQUENCE public.planned_entry_statuses_status_id_seq OWNED BY public.planned_entry_statuses.status_id;


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.role_permissions (
    role_permission_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    role_name character varying(255) NOT NULL,
    permission character varying(255) NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO celeiro_user;

--
-- Name: role_permissions_role_permission_id_seq; Type: SEQUENCE; Schema: public; Owner: celeiro_user
--

CREATE SEQUENCE public.role_permissions_role_permission_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_permissions_role_permission_id_seq OWNER TO celeiro_user;

--
-- Name: role_permissions_role_permission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: celeiro_user
--

ALTER SEQUENCE public.role_permissions_role_permission_id_seq OWNED BY public.role_permissions.role_permission_id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.roles (
    role_name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.roles OWNER TO celeiro_user;

--
-- Name: savings_goals; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.savings_goals (
    savings_goal_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id integer NOT NULL,
    organization_id integer NOT NULL,
    name character varying(100) NOT NULL,
    goal_type character varying(20) NOT NULL,
    target_amount numeric(15,2) NOT NULL,
    due_date date,
    icon character varying(10),
    color character varying(7),
    is_active boolean DEFAULT true NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    completed_at timestamp without time zone,
    notes text,
    initial_amount numeric(15,2) DEFAULT 0 NOT NULL,
    CONSTRAINT savings_goals_goal_type_check CHECK (((goal_type)::text = ANY ((ARRAY['reserva'::character varying, 'investimento'::character varying])::text[]))),
    CONSTRAINT savings_goals_initial_amount_check CHECK ((initial_amount >= (0)::numeric)),
    CONSTRAINT savings_goals_target_amount_check CHECK ((target_amount > (0)::numeric))
);


ALTER TABLE public.savings_goals OWNER TO celeiro_user;

--
-- Name: COLUMN savings_goals.due_date; Type: COMMENT; Schema: public; Owner: celeiro_user
--

COMMENT ON COLUMN public.savings_goals.due_date IS 'Required for reserva type, optional for investimento';


--
-- Name: COLUMN savings_goals.initial_amount; Type: COMMENT; Schema: public; Owner: celeiro_user
--

COMMENT ON COLUMN public.savings_goals.initial_amount IS 'Initial balance already saved toward this goal before tracking started';


--
-- Name: savings_goals_savings_goal_id_seq; Type: SEQUENCE; Schema: public; Owner: celeiro_user
--

CREATE SEQUENCE public.savings_goals_savings_goal_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.savings_goals_savings_goal_id_seq OWNER TO celeiro_user;

--
-- Name: savings_goals_savings_goal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: celeiro_user
--

ALTER SEQUENCE public.savings_goals_savings_goal_id_seq OWNED BY public.savings_goals.savings_goal_id;


--
-- Name: tags; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.tags (
    tag_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer NOT NULL,
    organization_id integer NOT NULL,
    name character varying(100) NOT NULL,
    icon character varying(10) DEFAULT '🏷️'::character varying,
    color character varying(7) DEFAULT '#6B7280'::character varying
);


ALTER TABLE public.tags OWNER TO celeiro_user;

--
-- Name: tags_tag_id_seq; Type: SEQUENCE; Schema: public; Owner: celeiro_user
--

CREATE SEQUENCE public.tags_tag_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tags_tag_id_seq OWNER TO celeiro_user;

--
-- Name: tags_tag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: celeiro_user
--

ALTER SEQUENCE public.tags_tag_id_seq OWNED BY public.tags.tag_id;


--
-- Name: transaction_tags; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.transaction_tags (
    transaction_tag_id integer NOT NULL,
    transaction_id integer NOT NULL,
    tag_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.transaction_tags OWNER TO celeiro_user;

--
-- Name: transaction_tags_transaction_tag_id_seq; Type: SEQUENCE; Schema: public; Owner: celeiro_user
--

CREATE SEQUENCE public.transaction_tags_transaction_tag_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transaction_tags_transaction_tag_id_seq OWNER TO celeiro_user;

--
-- Name: transaction_tags_transaction_tag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: celeiro_user
--

ALTER SEQUENCE public.transaction_tags_transaction_tag_id_seq OWNED BY public.transaction_tags.transaction_tag_id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.transactions (
    transaction_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    account_id integer NOT NULL,
    category_id integer,
    description character varying(500) NOT NULL,
    amount numeric(15,2) NOT NULL,
    transaction_date date NOT NULL,
    transaction_type character varying(20) NOT NULL,
    ofx_fitid character varying(255),
    ofx_check_number character varying(50),
    ofx_memo text,
    raw_ofx_data jsonb,
    is_classified boolean DEFAULT false,
    classification_rule_id integer,
    notes text,
    tags character varying(255)[],
    is_ignored boolean DEFAULT false NOT NULL,
    original_description text,
    savings_goal_id integer
);


ALTER TABLE public.transactions OWNER TO celeiro_user;

--
-- Name: transactions_transaction_id_seq; Type: SEQUENCE; Schema: public; Owner: celeiro_user
--

CREATE SEQUENCE public.transactions_transaction_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_transaction_id_seq OWNER TO celeiro_user;

--
-- Name: transactions_transaction_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: celeiro_user
--

ALTER SEQUENCE public.transactions_transaction_id_seq OWNED BY public.transactions.transaction_id;


--
-- Name: user_organizations; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.user_organizations (
    user_organization_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    user_id integer NOT NULL,
    organization_id integer NOT NULL,
    user_role character varying(255) NOT NULL
);


ALTER TABLE public.user_organizations OWNER TO celeiro_user;

--
-- Name: user_organizations_user_organization_id_seq; Type: SEQUENCE; Schema: public; Owner: celeiro_user
--

CREATE SEQUENCE public.user_organizations_user_organization_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_organizations_user_organization_id_seq OWNER TO celeiro_user;

--
-- Name: user_organizations_user_organization_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: celeiro_user
--

ALTER SEQUENCE public.user_organizations_user_organization_id_seq OWNED BY public.user_organizations.user_organization_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: celeiro_user
--

CREATE TABLE public.users (
    user_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    email character varying(255) NOT NULL,
    name character varying(255) DEFAULT 'User'::character varying,
    phone integer DEFAULT 0,
    address character varying(255) DEFAULT ''::character varying,
    city character varying(255) DEFAULT ''::character varying,
    state character varying(255) DEFAULT ''::character varying,
    zip character varying(255) DEFAULT ''::character varying,
    country character varying(255) DEFAULT ''::character varying,
    latitude numeric(10,8) DEFAULT 0,
    longitude numeric(11,8) DEFAULT 0
);


ALTER TABLE public.users OWNER TO celeiro_user;

--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: celeiro_user
--

CREATE SEQUENCE public.users_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_user_id_seq OWNER TO celeiro_user;

--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: celeiro_user
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: accounts account_id; Type: DEFAULT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.accounts ALTER COLUMN account_id SET DEFAULT nextval('public.accounts_account_id_seq'::regclass);


--
-- Name: budget_items budget_item_id; Type: DEFAULT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.budget_items ALTER COLUMN budget_item_id SET DEFAULT nextval('public.budget_items_budget_item_id_seq'::regclass);


--
-- Name: budgets budget_id; Type: DEFAULT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.budgets ALTER COLUMN budget_id SET DEFAULT nextval('public.budgets_budget_id_seq'::regclass);


--
-- Name: categories category_id; Type: DEFAULT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.categories ALTER COLUMN category_id SET DEFAULT nextval('public.categories_category_id_seq'::regclass);


--
-- Name: category_budgets category_budget_id; Type: DEFAULT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.category_budgets ALTER COLUMN category_budget_id SET DEFAULT nextval('public.category_budgets_category_budget_id_seq'::regclass);


--
-- Name: goose_db_version id; Type: DEFAULT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.goose_db_version ALTER COLUMN id SET DEFAULT nextval('public.goose_db_version_id_seq'::regclass);


--
-- Name: monthly_snapshots snapshot_id; Type: DEFAULT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.monthly_snapshots ALTER COLUMN snapshot_id SET DEFAULT nextval('public.monthly_snapshots_snapshot_id_seq'::regclass);


--
-- Name: organizations organization_id; Type: DEFAULT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.organizations ALTER COLUMN organization_id SET DEFAULT nextval('public.organizations_organization_id_seq'::regclass);


--
-- Name: patterns pattern_id; Type: DEFAULT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.patterns ALTER COLUMN pattern_id SET DEFAULT nextval('public.advanced_patterns_pattern_id_seq'::regclass);


--
-- Name: planned_entries planned_entry_id; Type: DEFAULT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.planned_entries ALTER COLUMN planned_entry_id SET DEFAULT nextval('public.planned_entries_planned_entry_id_seq'::regclass);


--
-- Name: planned_entry_statuses status_id; Type: DEFAULT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.planned_entry_statuses ALTER COLUMN status_id SET DEFAULT nextval('public.planned_entry_statuses_status_id_seq'::regclass);


--
-- Name: role_permissions role_permission_id; Type: DEFAULT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.role_permissions ALTER COLUMN role_permission_id SET DEFAULT nextval('public.role_permissions_role_permission_id_seq'::regclass);


--
-- Name: savings_goals savings_goal_id; Type: DEFAULT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.savings_goals ALTER COLUMN savings_goal_id SET DEFAULT nextval('public.savings_goals_savings_goal_id_seq'::regclass);


--
-- Name: tags tag_id; Type: DEFAULT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.tags ALTER COLUMN tag_id SET DEFAULT nextval('public.tags_tag_id_seq'::regclass);


--
-- Name: transaction_tags transaction_tag_id; Type: DEFAULT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.transaction_tags ALTER COLUMN transaction_tag_id SET DEFAULT nextval('public.transaction_tags_transaction_tag_id_seq'::regclass);


--
-- Name: transactions transaction_id; Type: DEFAULT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.transactions ALTER COLUMN transaction_id SET DEFAULT nextval('public.transactions_transaction_id_seq'::regclass);


--
-- Name: user_organizations user_organization_id; Type: DEFAULT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.user_organizations ALTER COLUMN user_organization_id SET DEFAULT nextval('public.user_organizations_user_organization_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.accounts (account_id, created_at, updated_at, user_id, organization_id, name, account_type, bank_name, balance, currency, is_active) FROM stdin;
1	2025-10-29 11:32:35.743398	2025-10-29 11:32:35.743398	1	1	Conta Nubank	checking	Nu Pagamentos S.A.	2875.77	BRL	t
2	2025-10-31 12:46:58.78388	2025-10-31 12:46:58.78388	2	2	Checking Account	checking	Test Bank	5000.00	BRL	t
3	2025-12-26 14:30:12.910322	2025-12-26 14:30:12.910322	3	3	Conta Principal	checking	Nubank	0.00	BRL	t
4	2025-12-26 14:39:30.041399	2025-12-26 14:39:30.041399	4	4	Conta Principal	checking	Meu Banco	0.00	BRL	t
5	2025-12-26 14:39:40.806336	2025-12-26 14:39:40.806336	5	5	Conta Principal	checking	Meu Banco	0.00	BRL	t
\.


--
-- Data for Name: budget_items; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.budget_items (budget_item_id, created_at, updated_at, budget_id, category_id, planned_amount) FROM stdin;
3	2025-10-31 12:48:30.647111	2025-10-31 12:48:30.647111	1	35	1500.00
4	2025-10-31 12:48:30.647111	2025-10-31 12:48:30.647111	1	36	1000.00
\.


--
-- Data for Name: budgets; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.budgets (budget_id, created_at, updated_at, user_id, organization_id, name, month, year, budget_type, amount, is_active) FROM stdin;
1	2025-10-31 12:46:58.791322	2025-10-31 12:46:58.791322	2	2	October Budget	10	2025	maior	3000.00	t
2	2025-10-31 17:23:30.510644	2025-10-31 17:23:30.510644	1	1	Orçamento Outubro	10	2025	fixed	46000.00	t
3	2025-11-01 13:22:40.836119	2025-11-01 13:22:40.836119	1	1	asdf	11	2025	calculated	0.00	t
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.categories (category_id, created_at, updated_at, name, icon, is_system, user_id, color, category_type) FROM stdin;
5	2025-10-28 20:29:51.334377	2025-10-28 20:29:51.334377	Educação	📚	t	\N	#3B82F6	expense
3	2025-10-28 20:29:51.334377	2025-10-28 20:29:51.334377	Moradia	🏠	t	\N	#84CC16	expense
7	2025-10-28 20:29:51.334377	2025-10-28 20:29:51.334377	Outros	📦	t	\N	#8B5CF6	expense
4	2025-10-28 20:29:51.334377	2025-10-28 20:29:51.334377	Saúde	💊	t	\N	#14B8A6	expense
2	2025-10-28 20:29:51.334377	2025-10-28 20:29:51.334377	Transporte	🚗	t	\N	#F97316	expense
54	2025-12-27 19:38:03.076663	2025-12-27 19:38:03.076663	Bares e Restaurantes	🍔	f	3	#F59E0B	expense
48	2025-11-08 13:21:19.579938	2025-12-30 12:23:38.908267	Cuidados pessoais	💅	f	3	#fb9d9d	expense
49	2025-11-08 13:21:19.579938	2025-12-30 12:23:55.307829	Dívidas	💳	f	3	#e63333	expense
34	2025-10-29 11:57:02.794129	2025-10-29 11:57:02.794129	Restaurantes	🍽️	f	1	#F59E0B	expense
35	2025-10-31 12:47:58.239665	2025-10-31 12:47:58.239665	Groceries	🛒	f	2	#3B82F6	expense
36	2025-10-31 12:47:58.239665	2025-10-31 12:47:58.239665	Transport	🚗	f	2	#EC4899	expense
39	2025-11-08 13:21:19.579938	2025-11-08 13:21:19.579938	Mercado	🛒	f	1	#84CC16	expense
40	2025-11-08 13:21:19.579938	2025-11-08 13:21:19.579938	Pessoal - Saque	💵	f	1	#8B5CF6	expense
41	2025-11-08 13:21:19.579938	2025-11-08 13:21:19.579938	Bares e Restaurantes	🍽️	f	1	#14B8A6	expense
43	2025-11-08 13:21:19.579938	2025-11-08 13:21:19.579938	Saque Economias	💸	f	1	#F97316	expense
45	2025-11-08 13:21:19.579938	2025-11-08 13:21:19.579938	Compras - Supérfluos	🎁	f	1	#10B981	expense
46	2025-11-08 13:21:19.579938	2025-11-08 13:21:19.579938	Compras - Não Recorrente	📦	f	1	#6366F1	expense
47	2025-11-08 13:21:19.579938	2025-11-08 13:21:19.579938	Compras - Essenciais	🛍️	f	1	#F472B6	expense
50	2025-11-08 13:21:19.579938	2025-11-08 13:21:19.579938	TV/Internet/Telefone	📱	f	3	#06B6D4	expense
44	2025-11-08 13:21:19.579938	2025-12-30 12:29:10.464329	Estilo de vida	✨	f	3	#939048	expense
55	2025-12-27 19:40:11.178646	2025-12-30 12:29:25.045602	Presentes e Doações	🎁	f	3	#4658b4	expense
52	2025-11-08 13:21:19.579938	2025-12-30 12:29:53.792229	Empresa	💼	f	3	#a33e9f	expense
58	2025-12-30 14:04:03.306637	2025-12-30 14:04:03.306637	Mercado	🛒	f	3	#F472B6	expense
57	2025-12-30 14:03:50.022421	2025-12-30 14:35:52.269978	Compras Essenciais	👕	f	3	#6366F1	expense
56	2025-12-30 14:02:28.780782	2025-12-30 14:35:59.162008	Compras Supérfluos	🎮	f	3	#10B981	expense
59	2025-12-30 15:45:00.227808	2025-12-30 15:45:25.100321	Economias	💎	f	3	#1b11a2	expense
53	2025-12-27 12:23:10.113849	2025-12-28 23:55:29.112372	Receita	💰	f	3	#199455	income
\.


--
-- Data for Name: category_budgets; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.category_budgets (category_budget_id, created_at, updated_at, user_id, organization_id, category_id, month, year, budget_type, planned_amount, is_consolidated, consolidated_at) FROM stdin;
1	2025-10-31 12:48:30.647111	2025-11-08 12:54:43.532691	2	2	35	10	2025	maior	1500.00	f	\N
2	2025-10-31 12:48:30.647111	2025-11-08 12:54:43.532691	2	2	36	10	2025	maior	1000.00	f	\N
3	2025-11-08 13:16:46.369881	2025-11-08 13:16:46.369881	1	1	2	11	2025	maior	2000.00	f	\N
4	2025-11-08 13:16:46.369881	2025-11-08 13:16:46.369881	1	1	3	11	2025	maior	8500.00	f	\N
5	2025-11-08 13:16:46.369881	2025-11-08 13:16:46.369881	1	1	4	11	2025	maior	3000.00	f	\N
6	2025-11-08 13:16:46.369881	2025-11-08 13:16:46.369881	1	1	5	11	2025	maior	300.00	f	\N
9	2025-11-08 13:21:19.607216	2025-11-08 13:21:19.607216	1	1	39	11	2025	maior	3500.00	f	\N
10	2025-11-08 13:21:19.607216	2025-11-08 13:21:19.607216	1	1	40	11	2025	maior	100.00	f	\N
11	2025-11-08 13:21:19.607216	2025-11-08 13:21:19.607216	1	1	41	11	2025	maior	1500.00	f	\N
13	2025-11-08 13:21:19.607216	2025-11-08 13:21:19.607216	1	1	43	11	2025	fixed	0.00	f	\N
14	2025-11-08 13:21:19.607216	2025-11-08 13:21:19.607216	1	1	44	11	2025	maior	370.00	f	\N
15	2025-11-08 13:21:19.607216	2025-11-08 13:21:19.607216	1	1	45	11	2025	maior	1200.00	f	\N
16	2025-11-08 13:21:19.607216	2025-11-08 13:21:19.607216	1	1	46	11	2025	fixed	0.00	f	\N
17	2025-11-08 13:21:19.607216	2025-11-08 13:21:19.607216	1	1	47	11	2025	maior	2000.00	f	\N
18	2025-11-08 13:21:19.607216	2025-11-08 13:21:19.607216	1	1	48	11	2025	maior	300.00	f	\N
19	2025-11-08 13:21:19.607216	2025-11-08 13:21:19.607216	1	1	49	11	2025	fixed	0.00	f	\N
20	2025-11-08 13:21:19.607216	2025-11-08 13:21:19.607216	1	1	50	11	2025	maior	900.00	f	\N
22	2025-11-08 13:21:19.607216	2025-11-08 13:21:19.607216	1	1	52	11	2025	maior	5800.00	f	\N
24	2025-12-30 18:12:30.613077	2025-12-30 18:12:30.613077	3	3	55	12	2025	fixed	1500.00	f	\N
23	2025-12-27 12:37:30.473413	2025-12-30 18:18:45.463492	3	3	53	12	2025	maior	42000.00	f	\N
25	2025-12-30 18:19:01.704441	2025-12-30 18:19:01.704441	3	3	49	12	2025	maior	5000.00	f	\N
26	2025-12-30 18:45:53.272735	2025-12-30 18:45:53.272735	3	3	52	12	2025	calculated	0.00	f	\N
27	2025-12-30 18:46:23.07485	2025-12-30 18:46:23.07485	3	3	3	12	2025	maior	8500.00	f	\N
28	2025-12-30 18:46:45.435717	2025-12-30 18:46:45.435717	3	3	58	12	2025	fixed	3500.00	f	\N
29	2025-12-30 18:47:07.795152	2025-12-30 18:47:07.795152	3	3	5	12	2025	fixed	500.00	f	\N
30	2025-12-30 19:47:15.192663	2025-12-30 19:47:15.192663	3	3	4	12	2025	maior	3500.00	f	\N
31	2025-12-30 19:47:36.479692	2025-12-30 19:47:36.479692	3	3	2	12	2025	maior	2000.00	f	\N
32	2025-12-30 19:47:57.308449	2025-12-30 19:47:57.308449	3	3	50	12	2025	maior	900.00	f	\N
33	2025-12-30 19:48:15.202854	2025-12-30 19:48:15.202854	3	3	48	12	2025	fixed	300.00	f	\N
34	2025-12-30 19:48:41.495881	2025-12-30 19:48:50.019599	3	3	44	12	2025	maior	370.00	f	\N
35	2025-12-30 19:49:09.141798	2025-12-30 19:49:09.141798	3	3	54	12	2025	fixed	2000.00	f	\N
36	2025-12-30 19:49:22.404809	2025-12-30 19:49:22.404809	3	3	57	12	2025	maior	1500.00	f	\N
37	2025-12-30 19:49:29.577778	2025-12-30 19:49:29.577778	3	3	56	12	2025	maior	1500.00	f	\N
\.


--
-- Data for Name: goose_db_version; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.goose_db_version (id, version_id, is_applied, tstamp) FROM stdin;
1	0	t	2025-10-28 20:29:51.241142
2	1	t	2025-10-28 20:29:51.283698
3	2	t	2025-10-28 20:29:51.315489
4	3	t	2025-10-28 20:29:51.334377
5	4	t	2025-10-28 20:29:51.341327
6	5	t	2025-10-28 20:29:51.349845
7	6	t	2025-10-28 20:29:51.361683
8	7	t	2025-10-28 20:29:51.380138
34	8	t	2025-11-01 12:11:08.064438
35	9	t	2025-11-01 12:11:08.085306
36	10	t	2025-11-01 12:11:08.130794
37	11	t	2025-11-01 12:13:05.081155
38	12	t	2025-11-08 12:54:43.532691
39	13	t	2025-11-08 12:54:43.568736
40	14	t	2025-11-08 14:43:07.024432
41	15	t	2025-12-26 16:44:57.864267
42	16	t	2025-12-27 20:21:02.424155
43	17	t	2025-12-27 20:21:08.314754
44	18	t	2025-12-28 20:52:51.423006
45	19	t	2025-12-28 23:57:28.554942
46	20	t	2025-12-29 01:17:33.33269
47	21	t	2025-12-29 13:23:29.264961
48	22	t	2025-12-30 12:25:53.556815
49	23	t	2025-12-30 19:22:46.75707
50	24	t	2025-12-30 20:09:51.042577
\.


--
-- Data for Name: monthly_snapshots; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.monthly_snapshots (snapshot_id, created_at, user_id, organization_id, category_id, month, year, planned_amount, actual_amount, variance_percent, budget_type) FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.organizations (organization_id, created_at, updated_at, name, address, city, state, zip, country, latitude, longitude) FROM stdin;
1	2025-10-29 11:31:15.037895	2025-10-29 11:31:15.037895	Test Org						0.00000000	0.00000000
2	2025-10-31 12:27:09.69659	2025-10-31 12:27:09.69659	Test Organization						0.00000000	0.00000000
3	2025-12-26 13:45:17.027944	2025-12-26 13:45:17.027944	lucas.tamoios@gmail.com						0.00000000	0.00000000
4	2025-12-26 14:39:30.029002	2025-12-26 14:39:30.029002	newuser_1766759969@example.com						0.00000000	0.00000000
5	2025-12-26 14:39:40.800912	2025-12-26 14:39:40.800912	newuser_1766759980@example.com						0.00000000	0.00000000
\.


--
-- Data for Name: patterns; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.patterns (pattern_id, created_at, updated_at, user_id, organization_id, description_pattern, date_pattern, weekday_pattern, amount_min, amount_max, target_description, target_category_id, apply_retroactively, is_active) FROM stdin;
1	2025-11-08 17:18:01.883397	2025-11-08 17:18:01.883397	1	1	.*Plano NuCel 45GB.*	.*	\N	40.50	49.50	Plano NuCel 45GB	50	f	t
3	2025-12-27 20:00:40.694215	2025-12-27 21:00:42.438739	3	3	.*ARQUIDIOCESE DE MONTES CLAROS.*	.*	\N	0.00	60.00	Oferta - Arquidiocese	55	f	t
4	2025-12-28 20:50:27.968195	2025-12-28 20:50:27.968195	3	3	.*COPASA MINAS GERAIS.*	\N	\N	50.00	1200.00	Conta de Água	3	f	t
5	2025-12-29 19:11:10.886931	2025-12-29 19:11:10.886931	3	3	Amazonprimebr	\N	\N	17.91	21.89	Amazon Prime	50	f	t
6	2025-12-30 13:28:17.546914	2025-12-30 13:29:34.592216	3	3	.*Dardiane Alves Santa Rosa.*	.*	\N	1900.00	2500.00	Salário - Dardiane	52	f	t
7	2025-12-30 13:59:49.031342	2025-12-30 13:59:49.031342	3	3	.*Transferência recebida pelo Pix Wise Brasil Corretora de Câmbio.*	.*	\N	7000.00	100000.00	Salário	53	t	t
8	2025-12-30 16:30:53.468301	2025-12-30 16:30:53.468301	3	3	.*Nelson Pereira da Silva.*	.*	\N	40.00	60.00	Lavagem do Carro	2	t	t
9	2025-12-30 16:32:20.106668	2025-12-30 16:32:20.106668	3	3	.*Associacao Brasileira Arautos do Evangelho.*	.*	\N	0.00	60.00	Oferta - Arautos	55	t	t
10	2025-12-30 16:33:12.990031	2025-12-30 16:33:12.990031	3	3	.*Drogaria Minas Brasil.*	.*	\N	\N	\N	Drogaria Minas Brasil	4	t	t
11	2025-12-30 18:10:55.210376	2025-12-30 18:10:55.210376	3	3	Studio Junia Guimaraes Parcela.*	.*	\N	550.58	672.93	Parcela Natação das Crianças	44	t	t
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.permissions (permission, created_at, updated_at) FROM stdin;
view_organizations	2025-10-28 20:29:51.283698	2025-10-28 20:29:51.283698
edit_organizations	2025-10-28 20:29:51.283698	2025-10-28 20:29:51.283698
create_organizations	2025-10-28 20:29:51.283698	2025-10-28 20:29:51.283698
delete_organizations	2025-10-28 20:29:51.283698	2025-10-28 20:29:51.283698
view_regular_users	2025-10-28 20:29:51.283698	2025-10-28 20:29:51.283698
edit_regular_users	2025-10-28 20:29:51.283698	2025-10-28 20:29:51.283698
create_regular_users	2025-10-28 20:29:51.283698	2025-10-28 20:29:51.283698
delete_regular_users	2025-10-28 20:29:51.283698	2025-10-28 20:29:51.283698
\.


--
-- Data for Name: planned_entries; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.planned_entries (planned_entry_id, created_at, updated_at, user_id, organization_id, category_id, description, amount, is_recurrent, parent_entry_id, expected_day, is_active, pattern_id, expected_day_start, expected_day_end, amount_min, amount_max, entry_type, savings_goal_id) FROM stdin;
1	2025-11-08 13:16:46.387653	2025-11-08 13:16:46.387653	3	3	2	Seguro Carro	500.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
2	2025-11-08 13:16:46.387653	2025-11-08 13:16:46.387653	3	3	2	IPVA	500.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
4	2025-11-08 13:16:46.387653	2025-11-08 13:16:46.387653	3	3	3	Condomínio	310.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
5	2025-11-08 13:16:46.387653	2025-11-08 13:16:46.387653	3	3	3	Conta de Água	360.55	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
6	2025-11-08 13:16:46.387653	2025-11-08 13:16:46.387653	3	3	3	Conta de Energia Elétrica	485.58	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
8	2025-11-08 13:16:46.387653	2025-11-08 13:16:46.387653	3	3	3	Reserva IPTU	100.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
9	2025-11-08 13:16:46.387653	2025-11-08 13:16:46.387653	3	3	4	Plano Amil	1200.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
10	2025-11-08 13:16:46.387653	2025-11-08 13:16:46.387653	3	3	4	Natação Crianças	611.75	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
11	2025-11-08 13:16:46.387653	2025-11-08 13:16:46.387653	3	3	4	Avelar (Seguro)	123.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
12	2025-11-08 13:16:46.387653	2025-11-08 13:16:46.387653	3	3	4	Muay Thai	390.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
13	2025-11-08 13:16:46.387653	2025-11-08 13:16:46.387653	3	3	4	Personal Raquel	600.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
14	2025-11-08 13:16:46.387653	2025-11-08 13:16:46.387653	3	3	4	Terapia	220.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
15	2025-11-08 13:16:46.387653	2025-11-08 13:16:46.387653	3	3	4	Plano de saúde (último mês unim)	1372.70	f	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
16	2025-11-08 13:16:46.387653	2025-11-08 13:16:46.387653	3	3	5	Livros	300.00	f	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
17	2025-11-08 13:16:46.387653	2025-11-08 13:16:46.387653	3	3	5	Escola	2500.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
23	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	44	Seguro de Vida - NuBank	23.98	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
24	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	44	Seguro de Vida	235.62	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
25	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	48	Salão Lucas	35.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
28	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	50	Cursor	120.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
29	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	50	Amazon Prime	19.90	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
30	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	50	Google Photos	11.99	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
31	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	50	Apple storage Lucas	14.90	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
32	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	50	YouTube	32.90	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
33	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	50	Deezer	34.90	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
34	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	50	Apple iCloud	49.90	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
35	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	50	ChatGPT	130.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
37	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	50	Conta VIVO Lucas	45.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
38	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	50	Jetbrains	138.73	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
39	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	50	Apple	14.90	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
40	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	50	Conta VIVO Raquel	95.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
41	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	50	Google One	7.99	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
46	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	52	MEI	80.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
47	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	52	Impostos - Simples	2259.82	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
48	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	52	Impostos FGTS + INSS	622.56	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
49	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	52	Coworking	300.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
50	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	52	Contador	350.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
51	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	52	Salário Dardiane	2300.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
53	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	52	Reserva	0.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
3	2025-11-08 13:16:46.387653	2025-11-08 13:16:46.387653	3	3	3	Conserto Leds escada	951.00	f	\N	4	t	\N	4	4	\N	\N	expense	\N
7	2025-11-08 13:16:46.387653	2025-11-08 13:16:46.387653	3	3	3	Parcela da Caixa	7500.00	t	\N	5	t	\N	5	5	\N	\N	expense	\N
26	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	49	Cartão Nubank	8886.13	f	\N	5	t	\N	5	5	\N	\N	expense	\N
27	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	49	Dinheiro Mãe	12200.00	f	\N	3	t	\N	3	3	\N	\N	expense	\N
52	2025-11-08 13:21:19.599683	2025-11-08 13:21:19.599683	3	3	52	Férias Dardi	505.00	f	\N	5	t	\N	5	5	\N	\N	expense	\N
36	2025-11-08 13:21:19.599683	2025-12-30 13:31:47.450048	3	3	50	Internet	270.00	t	\N	\N	t	\N	\N	\N	\N	\N	expense	\N
\.


--
-- Data for Name: planned_entry_statuses; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.planned_entry_statuses (status_id, created_at, updated_at, planned_entry_id, month, year, status, matched_transaction_id, matched_amount, matched_at, dismissed_at, dismissal_reason) FROM stdin;
2	2025-12-28 23:27:08.983519	2025-12-28 23:27:08.990652	7	12	2025	matched	734	7500.00	2025-12-28 23:27:08	\N	\N
6	2025-12-30 15:50:01.636829	2025-12-30 15:50:01.648715	37	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
4	2025-12-30 15:50:01.634763	2025-12-30 15:50:01.649665	35	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
5	2025-12-30 15:50:01.635332	2025-12-30 15:50:01.649701	34	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
3	2025-12-30 15:50:01.633576	2025-12-30 15:50:01.650157	36	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
7	2025-12-30 15:50:01.645418	2025-12-30 15:50:01.650415	38	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
8	2025-12-30 15:50:01.647476	2025-12-30 15:50:01.653186	39	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
11	2025-12-30 15:50:01.656755	2025-12-30 15:50:01.658517	41	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
13	2025-12-30 15:50:01.657376	2025-12-30 15:50:01.659553	49	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
12	2025-12-30 15:50:01.65697	2025-12-30 15:50:01.659576	46	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
10	2025-12-30 15:50:01.656657	2025-12-30 15:50:01.659736	47	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
14	2025-12-30 15:50:01.657379	2025-12-30 15:50:01.659403	48	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
9	2025-12-30 15:50:01.656424	2025-12-30 15:50:01.66042	40	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
15	2025-12-30 15:50:01.664304	2025-12-30 15:50:01.665878	50	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
18	2025-12-30 15:50:01.664872	2025-12-30 15:50:01.66639	24	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
17	2025-12-30 15:50:01.66476	2025-12-30 15:50:01.666392	23	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
16	2025-12-30 15:50:01.6648	2025-12-30 15:50:01.666426	51	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
20	2025-12-30 15:50:01.665165	2025-12-30 15:50:01.667839	53	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
19	2025-12-30 15:50:01.665176	2025-12-30 15:50:01.667849	25	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
22	2025-12-30 15:50:01.670404	2025-12-30 15:50:01.671801	28	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
23	2025-12-30 15:50:01.670549	2025-12-30 15:50:01.672089	31	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
24	2025-12-30 15:50:01.670471	2025-12-30 15:50:01.672103	30	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
21	2025-12-30 15:50:01.670368	2025-12-30 15:50:01.672122	29	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
26	2025-12-30 15:50:01.671209	2025-12-30 15:50:01.672892	32	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
25	2025-12-30 15:50:01.671099	2025-12-30 15:50:01.67363	2	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
27	2025-12-30 15:50:01.67442	2025-12-30 15:50:01.67624	33	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
28	2025-12-30 15:50:01.675328	2025-12-30 15:50:01.676608	8	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
29	2025-12-30 15:50:01.676248	2025-12-30 15:50:01.677895	6	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
30	2025-12-30 15:50:01.676307	2025-12-30 15:50:01.677899	4	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
31	2025-12-30 15:50:01.676727	2025-12-30 15:50:01.67818	5	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
32	2025-12-30 15:50:01.676838	2025-12-30 15:50:01.678251	9	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
35	2025-12-30 15:50:01.679721	2025-12-30 15:50:01.680819	12	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
33	2025-12-30 15:50:01.678453	2025-12-30 15:50:01.680994	10	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
34	2025-12-30 15:50:01.678887	2025-12-30 15:50:01.681101	11	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
36	2025-12-30 15:50:01.680626	2025-12-30 15:50:01.681322	17	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
38	2025-12-30 15:50:01.680742	2025-12-30 15:50:01.682278	13	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
37	2025-12-30 15:50:01.68063	2025-12-30 15:50:01.682288	14	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
39	2025-12-30 15:50:01.683499	2025-12-30 15:50:01.684648	7	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
40	2025-12-30 15:50:01.684045	2025-12-30 15:50:01.684781	1	11	2025	dismissed	\N	\N	\N	2025-12-30 12:50:01	
41	2025-12-30 15:50:06.306457	2025-12-30 19:51:46.529434	36	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
42	2025-12-30 15:50:06.306556	2025-12-30 19:51:46.529421	34	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
49	2025-12-30 15:50:06.321508	2025-12-30 19:51:46.538219	47	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
43	2025-12-30 15:50:06.307834	2025-12-30 19:51:46.530205	39	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
51	2025-12-30 15:50:06.322253	2025-12-30 19:51:46.538403	48	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
58	2025-12-30 15:50:06.332248	2025-12-30 19:51:46.544187	25	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
69	2025-12-30 15:50:06.346073	2025-12-30 19:51:46.555337	9	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
64	2025-12-30 15:50:06.340777	2025-12-30 19:51:46.553881	33	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
65	2025-12-30 15:50:06.342754	2025-12-30 19:51:46.548868	2	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
57	2025-12-30 15:50:06.331251	2025-12-30 19:51:46.544282	53	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
75	2025-12-30 15:50:06.35135	2025-12-30 19:51:46.560524	14	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
56	2025-12-30 15:50:06.33102	2025-12-30 19:51:46.539845	50	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
67	2025-12-30 15:50:06.344688	2025-12-30 19:51:46.548869	5	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
46	2025-12-30 15:50:06.309562	2025-12-30 19:51:46.530201	37	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
55	2025-12-30 15:50:06.330761	2025-12-30 19:51:46.540437	51	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
70	2025-12-30 15:50:06.34614	2025-12-30 19:51:46.555579	8	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
48	2025-12-30 15:50:06.321104	2025-12-30 19:51:46.534813	41	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
66	2025-12-30 15:50:06.344335	2025-12-30 19:51:46.548868	4	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
63	2025-12-30 15:50:06.340593	2025-12-30 19:51:46.548975	31	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
77	2025-12-30 15:50:06.352524	2025-12-30 19:51:46.560791	17	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
71	2025-12-30 15:50:06.347701	2025-12-30 19:51:46.556838	10	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
62	2025-12-30 15:50:06.34058	2025-12-30 19:51:46.554016	32	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
73	2025-12-30 15:50:06.350959	2025-12-30 19:51:46.561028	13	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
59	2025-12-30 15:50:06.338389	2025-12-30 19:51:46.545635	28	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
50	2025-12-30 15:50:06.321179	2025-12-30 19:51:46.536223	46	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
45	2025-12-30 15:50:06.308973	2025-12-30 19:51:46.530496	38	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
53	2025-12-30 15:50:06.330782	2025-12-30 19:51:46.544176	24	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
72	2025-12-30 15:50:06.350075	2025-12-30 19:51:46.556996	11	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
60	2025-12-30 15:50:06.339399	2025-12-30 19:51:46.546769	29	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
54	2025-12-30 15:50:06.330808	2025-12-30 19:51:46.544588	23	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
68	2025-12-30 15:50:06.345329	2025-12-30 19:51:46.554221	6	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
74	2025-12-30 15:50:06.350902	2025-12-30 19:51:46.558396	12	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
61	2025-12-30 15:50:06.339398	2025-12-30 19:51:46.547997	30	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
76	2025-12-30 15:50:06.352454	2025-12-30 19:51:46.56134	1	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
78	2025-12-30 15:50:06.354651	2025-12-30 19:51:46.562188	7	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
257	2025-12-30 16:48:40.810227	2025-12-30 16:48:40.811554	5	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
260	2025-12-30 16:48:40.811374	2025-12-30 16:48:40.81233	10	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
258	2025-12-30 16:48:40.811139	2025-12-30 16:48:40.812915	6	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
261	2025-12-30 16:48:40.811373	2025-12-30 16:48:40.813035	9	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
259	2025-12-30 16:48:40.811328	2025-12-30 16:48:40.813456	8	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
262	2025-12-30 16:48:40.81373	2025-12-30 16:48:40.816095	12	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
263	2025-12-30 16:48:40.813819	2025-12-30 16:48:40.816102	11	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
264	2025-12-30 16:48:40.814013	2025-12-30 16:48:40.816497	13	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
265	2025-12-30 16:48:40.815307	2025-12-30 16:48:40.816575	14	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
266	2025-12-30 16:48:40.816989	2025-12-30 16:48:40.81881	17	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
267	2025-12-30 16:48:40.816995	2025-12-30 16:48:40.818769	1	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
231	2025-12-30 16:48:40.779745	2025-12-30 16:48:40.785178	36	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
232	2025-12-30 16:48:40.782685	2025-12-30 16:48:40.787449	34	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
233	2025-12-30 16:48:40.784083	2025-12-30 16:48:40.787819	35	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
234	2025-12-30 16:48:40.78508	2025-12-30 16:48:40.788697	37	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
236	2025-12-30 16:48:40.787297	2025-12-30 16:48:40.789278	39	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
235	2025-12-30 16:48:40.787599	2025-12-30 16:48:40.790137	38	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
237	2025-12-30 16:48:40.789511	2025-12-30 16:48:40.791348	40	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
238	2025-12-30 16:48:40.792448	2025-12-30 16:48:40.794253	41	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
239	2025-12-30 16:48:40.794148	2025-12-30 16:48:40.797375	46	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
241	2025-12-30 16:48:40.794926	2025-12-30 16:48:40.797399	47	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
242	2025-12-30 16:48:40.795112	2025-12-30 16:48:40.797439	48	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
240	2025-12-30 16:48:40.794939	2025-12-30 16:48:40.79758	49	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
243	2025-12-30 16:48:40.795939	2025-12-30 16:48:40.797877	50	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
244	2025-12-30 16:48:40.798314	2025-12-30 16:48:40.801713	51	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
248	2025-12-30 16:48:40.802	2025-12-30 16:48:40.803736	28	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
245	2025-12-30 16:48:40.801721	2025-12-30 16:48:40.803751	24	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
246	2025-12-30 16:48:40.801885	2025-12-30 16:48:40.803768	53	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
247	2025-12-30 16:48:40.801944	2025-12-30 16:48:40.804023	23	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
249	2025-12-30 16:48:40.802351	2025-12-30 16:48:40.804337	25	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
250	2025-12-30 16:48:40.80496	2025-12-30 16:48:40.806378	29	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
251	2025-12-30 16:48:40.806721	2025-12-30 16:48:40.807851	30	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
252	2025-12-30 16:48:40.80715	2025-12-30 16:48:40.808333	31	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
254	2025-12-30 16:48:40.807656	2025-12-30 16:48:40.808873	33	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
253	2025-12-30 16:48:40.807453	2025-12-30 16:48:40.809147	32	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
255	2025-12-30 16:48:40.807922	2025-12-30 16:48:40.809234	2	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
256	2025-12-30 16:48:40.809406	2025-12-30 16:48:40.81088	4	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
268	2025-12-30 16:48:40.819329	2025-12-30 16:48:40.820752	7	8	2025	dismissed	\N	\N	\N	2025-12-30 13:48:40	
269	2025-12-30 18:13:12.400565	2025-12-30 18:13:12.404525	51	12	2025	matched	1293	2169.19	2025-12-30 15:13:12	\N	\N
44	2025-12-30 15:50:06.30823	2025-12-30 19:51:46.528994	35	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
47	2025-12-30 15:50:06.320793	2025-12-30 19:51:46.534657	40	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
52	2025-12-30 15:50:06.323557	2025-12-30 19:51:46.538231	49	7	2025	dismissed	\N	\N	\N	2025-12-30 16:51:46	
308	2025-12-30 20:35:13.66283	2025-12-30 20:35:13.669483	10	12	2025	matched	725	611.75	2025-12-30 17:35:13	\N	\N
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.role_permissions (role_permission_id, created_at, updated_at, role_name, permission) FROM stdin;
1	2025-10-28 20:29:51.283698	2025-10-28 20:29:51.283698	regular_manager	view_regular_users
2	2025-10-28 20:29:51.283698	2025-10-28 20:29:51.283698	regular_manager	edit_regular_users
3	2025-10-28 20:29:51.283698	2025-10-28 20:29:51.283698	regular_manager	create_regular_users
4	2025-10-28 20:29:51.283698	2025-10-28 20:29:51.283698	regular_manager	delete_regular_users
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.roles (role_name, created_at, updated_at) FROM stdin;
admin	2025-10-28 20:29:51.283698	2025-10-28 20:29:51.283698
regular_manager	2025-10-28 20:29:51.283698	2025-10-28 20:29:51.283698
regular_user	2025-10-28 20:29:51.283698	2025-10-28 20:29:51.283698
\.


--
-- Data for Name: savings_goals; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.savings_goals (savings_goal_id, created_at, updated_at, user_id, organization_id, name, goal_type, target_amount, due_date, icon, color, is_active, is_completed, completed_at, notes, initial_amount) FROM stdin;
1	2025-12-29 13:14:31.145445	2025-12-29 13:14:31.145445	3	3	IPVA	reserva	7500.00	2026-03-31	🚗	#3B82F6	t	f	\N	\N	0.00
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.tags (tag_id, created_at, updated_at, user_id, organization_id, name, icon, color) FROM stdin;
1	2025-12-30 19:31:48.06307	2025-12-30 19:31:48.06307	3	3	Sirius Dev	💼	#8B5CF6
\.


--
-- Data for Name: transaction_tags; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.transaction_tags (transaction_tag_id, transaction_id, tag_id, created_at) FROM stdin;
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.transactions (transaction_id, created_at, updated_at, account_id, category_id, description, amount, transaction_date, transaction_type, ofx_fitid, ofx_check_number, ofx_memo, raw_ofx_data, is_classified, classification_rule_id, notes, tags, is_ignored, original_description, savings_goal_id) FROM stdin;
596	2025-12-26 14:40:31.594774	2025-12-29 13:46:20.975009	3	\N	Farroupilha Restaurant	220.00	2025-11-24	debit	692341a9-9237-4ef9-8fdf-ea5a88c36de7	\N	Farroupilha Restaurant	\N	f	\N	\N	\N	f	Farroupilha Restaurant	\N
631	2025-12-26 14:40:31.631371	2025-12-29 13:46:21.020515	3	\N	Shopping Montes Claros	3.00	2025-11-14	debit	69166575-76da-4ecf-b721-9285a91da26d	\N	Shopping Montes Claros	\N	f	\N	\N	\N	f	Shopping Montes Claros	\N
647	2025-12-26 14:40:31.661629	2025-12-29 13:46:21.029773	3	\N	Cordeiro Supermercados	508.80	2025-11-13	debit	6914e7de-17ef-4b8c-a3ed-4a55e58437e9	\N	Cordeiro Supermercados	\N	f	\N	\N	\N	f	Cordeiro Supermercados	\N
667	2025-12-26 14:40:31.6738	2025-12-29 13:46:21.045023	3	\N	Ajuste a crédito	3.88	2025-11-09	credit	690f567c-3772-4b6b-b855-93cc8500f6fc	\N	Ajuste a crédito	\N	f	\N	\N	\N	f	Ajuste a crédito	\N
697	2025-12-26 14:40:31.692665	2025-12-29 13:46:21.056426	3	\N	EBW*Spotify NuPay	40.90	2025-11-04	debit	6909dd39-8b8e-4c66-adac-f27744f95977	\N	EBW*Spotify - NuPay	\N	f	\N	\N	\N	f	EBW*Spotify NuPay	\N
699	2025-12-26 14:40:31.693695	2025-12-29 13:59:26.595445	3	\N	Arraial do Conto Parcela 3/4	886.50	2025-12-28	debit	6909451e-9aa1-4a39-9e84-c72e74bd8870	\N	Arraial do Conto - Parcela 3/4	\N	f	\N	\N	\N	f	Arraial do Conto Parcela 1/4	\N
800	2025-12-26 14:40:35.382866	2025-12-30 13:26:25.17682	3	\N	Transferência recebida pelo Pix DIEGO NERI DE CASTRO •••652806•• BCO BRADESCO SA (0237) Agência: 3860 Conta: 414999	170.19	2025-12-23	credit	694aec2a-5f94-4ddc-8599-49c8ccbf7b17	\N	Transferência recebida pelo Pix - DIEGO NERI DE CASTRO - •••.652.806-•• - BCO BRADESCO S.A. (0237) Agência: 3860 Conta: 41499-9	\N	f	\N	\N	\N	t	Transferência recebida pelo Pix DIEGO NERI DE CASTRO •••652806•• BCO BRADESCO SA (0237) Agência: 3860 Conta: 414999	\N
733	2025-12-26 14:40:35.310294	2025-12-30 13:26:41.922416	3	\N	Transferência Recebida SIRIUS EDICAO E SUPORTE TECNICO LTDA 29234819/000103 NU PAGAMENTOS IP (0260) Agência: 1 Conta: 924584522	37000.00	2025-12-03	credit	69305e87-4d4f-4c5c-ac92-9947494727ac	\N	Transferência Recebida - SIRIUS EDICAO E SUPORTE TECNICO LTDA - 29.234.819/0001-03 - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 92458452-2	\N	f	\N	\N	\N	t	Transferência Recebida SIRIUS EDICAO E SUPORTE TECNICO LTDA 29234819/000103 NU PAGAMENTOS IP (0260) Agência: 1 Conta: 924584522	\N
82	2025-10-30 19:22:33.561723	2025-12-26 14:03:27.630574	1	\N	Transferência enviada pelo Pix (saldo compartilhado) MIRAITA MACIEL DE ALMEIDA CPF •••893026•• Conta 120480	600.00	2025-10-02	debit	68ded5f0-c409-41bb-a7fa-f3d3ef3cf749	\N	Transferência enviada pelo Pix (saldo compartilhado) - MIRAITA MACIEL DE ALMEIDA - CPF •••.893.026-•• - Conta 12048-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix (saldo compartilhado) MIRAITA MACIEL DE ALMEIDA CPF •••893026•• Conta 120480	\N
89	2025-10-30 19:22:33.56842	2025-12-26 14:03:27.634465	1	\N	Resgate RDB	620.00	2025-10-08	credit	68e684f5-d35f-4b1e-96df-04340a21f670	\N	Resgate RDB	\N	f	\N	\N	\N	f	Resgate RDB	\N
299	2025-10-31 12:47:58.246902	2025-10-31 12:47:58.246902	2	\N	Supermarket purchase	300.00	2025-10-15	debit	\N	\N	\N	\N	f	\N	\N	\N	f	Supermarket purchase	\N
300	2025-10-31 12:47:58.246902	2025-10-31 12:47:58.246902	2	\N	Grocery store	250.00	2025-10-20	debit	\N	\N	\N	\N	f	\N	\N	\N	f	Grocery store	\N
1023	2025-12-29 13:58:36.38132	2025-12-29 13:58:36.38132	3	\N	Imperio do Pao	14.90	2025-12-27	debit	694e6c2c-d79a-49ca-b465-8e9a8b71f44c	\N	Imperio do Pao	\N	f	\N	\N	\N	f	Imperio do Pao	\N
1024	2025-12-29 13:58:36.396118	2025-12-29 13:58:36.396118	3	\N	Erasmo Pampulha Tennis	6.47	2025-12-27	debit	694f0671-2502-4182-a506-39a43bdac730	\N	Erasmo Pampulha Tennis	\N	f	\N	\N	\N	f	Erasmo Pampulha Tennis	\N
1025	2025-12-29 13:58:36.397206	2025-12-29 13:58:36.397206	3	\N	Plano NuCel 45GB	45.00	2025-12-27	debit	695022f2-d76d-48bb-a276-6a7a9cd5cd23	\N	Plano NuCel 45GB	\N	f	\N	\N	\N	f	Plano NuCel 45GB	\N
1026	2025-12-29 13:58:36.398951	2025-12-29 13:58:36.398951	3	\N	AppleCom/Bill	99.90	2025-12-27	debit	694e33e6-bcb0-414e-8755-1555b9b4b424	\N	Apple.Com/Bill	\N	f	\N	\N	\N	f	AppleCom/Bill	\N
1027	2025-12-29 13:58:36.399643	2025-12-29 13:58:36.399643	3	\N	Fruta Norte	26.00	2025-12-25	debit	694c296e-e421-484c-a920-71dac18b20c9	\N	Fruta Norte	\N	f	\N	\N	\N	f	Fruta Norte	\N
1028	2025-12-29 13:58:36.400328	2025-12-29 13:58:36.400328	3	\N	Fruta Norte	349.54	2025-12-25	debit	694c2942-804c-47b5-8880-236c9fed34bb	\N	Fruta Norte	\N	f	\N	\N	\N	f	Fruta Norte	\N
1030	2025-12-29 13:58:36.401638	2025-12-29 13:58:36.401638	3	\N	Sinval Tolentino Cama	18.48	2025-12-25	debit	694c2892-a485-4e89-8649-59a514fdf865	\N	Sinval Tolentino Cama	\N	f	\N	\N	\N	f	Sinval Tolentino Cama	\N
1032	2025-12-29 13:58:36.402859	2025-12-29 13:58:36.402859	3	\N	Villefort Atacadista	319.84	2025-12-24	debit	694ad8f7-d829-415e-b9b9-ffa077611fb4	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
1035	2025-12-29 13:58:36.405359	2025-12-29 13:58:36.405359	3	\N	Amazon	44.99	2025-12-24	debit	69476364-54dc-40bf-a646-93daef49faa5	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
1036	2025-12-29 13:58:36.405913	2025-12-29 13:58:36.405913	3	\N	Construtora e Empreend	5.00	2025-12-24	debit	694a8f50-0593-4217-bb0a-8dcf1fb2fff1	\N	Construtora e Empreend	\N	f	\N	\N	\N	f	Construtora e Empreend	\N
1037	2025-12-29 13:58:36.406378	2025-12-29 13:58:36.406378	3	\N	Cordeiro Supermercados	803.77	2025-12-23	debit	69494799-0522-4ebf-bded-022803202055	\N	Cordeiro Supermercados	\N	f	\N	\N	\N	f	Cordeiro Supermercados	\N
1038	2025-12-29 13:58:36.406915	2025-12-29 13:58:36.406915	3	\N	Via Edrive	65.00	2025-12-23	debit	694952c1-456a-4645-a625-35fe7d09cc18	\N	Via Edrive	\N	f	\N	\N	\N	f	Via Edrive	\N
1039	2025-12-29 13:58:36.407454	2025-12-29 13:58:36.407454	3	\N	Mercadolivre*2produto	30.90	2025-12-23	debit	69496340-7397-4db4-b4d4-a6873dccf7b2	\N	Mercadolivre*2produto	\N	f	\N	\N	\N	f	Mercadolivre*2produto	\N
1040	2025-12-29 13:58:36.407989	2025-12-29 13:58:36.407989	3	\N	Vila 61 Casa Bar	72.57	2025-12-23	debit	6949fc2b-6093-4663-b48b-463e5f3e1788	\N	Vila 61 Casa Bar	\N	f	\N	\N	\N	f	Vila 61 Casa Bar	\N
1041	2025-12-29 13:58:36.408497	2025-12-29 13:58:36.408497	3	\N	Posto Esplanada	214.90	2025-12-23	debit	69494eb5-f4a1-48e5-9ceb-e645dfac5ee3	\N	Posto Esplanada	\N	f	\N	\N	\N	f	Posto Esplanada	\N
1043	2025-12-29 13:58:36.409613	2025-12-29 13:58:36.409613	3	\N	Havan Montes Claros	359.95	2025-12-21	debit	6946d5da-2251-4a25-8a95-c702f8edd667	\N	Havan Montes Claros	\N	f	\N	\N	\N	f	Havan Montes Claros	\N
1044	2025-12-29 13:58:36.410407	2025-12-29 13:58:36.410407	3	\N	Amazon Marketplace	59.76	2025-12-21	debit	69468d74-9409-4372-936b-c1657929dc99	\N	Amazon Marketplace	\N	f	\N	\N	\N	f	Amazon Marketplace	\N
1045	2025-12-29 13:58:36.411387	2025-12-29 13:58:36.411387	3	\N	Amazon	27.18	2025-12-21	debit	69468d73-e88d-45f4-862f-26289923bd4a	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
1046	2025-12-29 13:58:36.412406	2025-12-29 13:58:36.412406	3	\N	Amazonmktplc*Gustavoam	43.80	2025-12-21	debit	6946c1ec-fef6-4d56-a40f-b3dff9703250	\N	Amazonmktplc*Gustavoam	\N	f	\N	\N	\N	f	Amazonmktplc*Gustavoam	\N
1047	2025-12-29 13:58:36.41311	2025-12-29 13:58:36.41311	3	\N	Amazon	30.99	2025-12-21	debit	694616ba-f9b8-4188-89d2-0af6e7aac59b	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
1048	2025-12-29 13:58:36.413789	2025-12-29 13:58:36.413789	3	\N	Casa Colombo	47.00	2025-12-21	debit	6946b99f-76fc-4fff-861c-718ae44e4d1c	\N	Casa Colombo	\N	f	\N	\N	\N	f	Casa Colombo	\N
1049	2025-12-29 13:58:36.416561	2025-12-29 13:58:36.416561	3	\N	Erasmo Pampulha Tennis	63.59	2025-12-21	debit	6946c972-4b2b-405a-9a81-9883243b6778	\N	Erasmo Pampulha Tennis	\N	f	\N	\N	\N	f	Erasmo Pampulha Tennis	\N
1050	2025-12-29 13:58:36.417205	2025-12-29 13:58:36.417205	3	\N	Fruta Norte	13.68	2025-12-21	debit	69471da8-70c0-422a-a2a1-5d39452849f6	\N	Fruta Norte	\N	f	\N	\N	\N	f	Fruta Norte	\N
1051	2025-12-29 13:58:36.417912	2025-12-29 13:58:36.417912	3	\N	Eduardo Fernandes Ribe	51.00	2025-12-21	debit	694702d8-b746-436f-b705-8b26d8be52dc	\N	Eduardo Fernandes Ribe	\N	f	\N	\N	\N	f	Eduardo Fernandes Ribe	\N
1052	2025-12-29 13:58:36.418594	2025-12-29 13:58:36.418594	3	\N	Mulher Moderna	159.00	2025-12-21	debit	69468eb2-b2a2-4459-a350-9e7757bdfc27	\N	Mulher Moderna	\N	f	\N	\N	\N	f	Mulher Moderna	\N
1053	2025-12-29 13:58:36.419159	2025-12-29 13:58:36.419159	3	\N	Ifd*Oba Hamburgueria L	72.79	2025-12-20	debit	69448259-f769-4da0-b39c-8a1d8764a9a6	\N	Ifd*Oba Hamburgueria L	\N	f	\N	\N	\N	f	Ifd*Oba Hamburgueria L	\N
1054	2025-12-29 13:58:36.419763	2025-12-29 13:58:36.419763	3	\N	Lucas L7	2289.00	2025-12-20	debit	6945b85a-b9be-4919-a717-e320b5726948	\N	Lucas L7	\N	f	\N	\N	\N	f	Lucas L7	\N
1055	2025-12-29 13:58:36.420309	2025-12-29 13:58:36.420309	3	\N	Superkilo	202.84	2025-12-20	debit	69458f56-b785-4fd4-b4d7-08acf222eead	\N	Superkilo	\N	f	\N	\N	\N	f	Superkilo	\N
1056	2025-12-29 13:58:36.420934	2025-12-29 13:58:36.420934	3	\N	Starlink Internet	270.00	2025-12-20	debit	69455567-dbc1-422f-a4de-e5bf74354264	\N	Starlink Internet	\N	f	\N	\N	\N	f	Starlink Internet	\N
1057	2025-12-29 13:58:36.421501	2025-12-29 13:58:36.421501	3	\N	Dra Jessica Carvalho N	570.00	2025-12-20	debit	69457a6e-9e02-466b-b9dc-c33acba0af27	\N	Dra Jessica Carvalho N	\N	f	\N	\N	\N	f	Dra Jessica Carvalho N	\N
1060	2025-12-29 13:58:36.423247	2025-12-29 13:58:36.423247	3	\N	Mercadofacil	7.62	2025-12-20	debit	6945505c-279d-4ef5-b8eb-66913f6971ff	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
1062	2025-12-29 13:58:36.424404	2025-12-29 13:58:36.424404	3	\N	Drogaria Minas Brasi	232.72	2025-12-19	debit	694444c4-8e5b-4720-8f8b-b5ce72964e79	\N	Drogaria Minas Brasi	\N	f	\N	\N	\N	f	Drogaria Minas Brasi	\N
1031	2025-12-29 13:58:36.402287	2025-12-29 13:59:26.597349	3	\N	Ec *Mxmimportacao Parcela 2/3	117.33	2025-12-28	debit	694aec8d-7413-4dda-99e9-91b89185bfc7	\N	Ec *Mxmimportacao - Parcela 2/3	\N	f	\N	\N	\N	f	Ec *Mxmimportacao Parcela 1/3	\N
1034	2025-12-29 13:58:36.403913	2025-12-29 13:59:26.598631	3	\N	Havan Montes Claros Parcela 2/10	99.99	2025-12-28	debit	694b26fd-66c6-45a2-91f8-db5073dd9f6d	\N	Havan Montes Claros - Parcela 2/10	\N	f	\N	\N	\N	f	Havan Montes Claros Parcela 1/10	\N
1033	2025-12-29 13:58:36.403342	2025-12-29 13:59:26.601341	3	\N	Ec *Mxmimportacao Parcela 2/3	1048.46	2025-12-28	debit	694ae866-ebc9-4745-9656-95990faadfc8	\N	Ec *Mxmimportacao - Parcela 2/3	\N	f	\N	\N	\N	f	Ec *Mxmimportacao Parcela 1/3	\N
1042	2025-12-29 13:58:36.409033	2025-12-29 17:04:13.41361	3	\N	Amazon: Mimosa na chuva: 14 (Pedido: 702-5210465-7222643)	56.23	2025-12-22	debit	69484de9-7f48-48e8-9ce5-ad7dc39133cb	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
1058	2025-12-29 13:58:36.422021	2025-12-30 16:33:13.000722	3	4	Drogaria Minas Brasil	89.09	2025-12-20	debit	694598e7-0f10-4590-8a53-35d0f57ce273	\N	Drogaria Minas Brasil	\N	f	\N	\N	\N	f	Drogaria Minas Brasil	\N
1029	2025-12-29 13:58:36.401011	2025-12-29 17:04:13.411845	3	\N	Amazon: Marcelino Pão e Vinho (+2 itens) (Pedido: 702-6467735-0302629)	105.71	2025-12-25	debit	694ad045-7e81-4bd9-bf96-de5b0ac7df7a	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
1061	2025-12-29 13:58:36.42382	2025-12-30 16:33:13.003135	3	4	Drogaria Minas Brasil	83.29	2025-12-19	debit	694417ed-63df-4163-895b-78dc731e63f9	\N	Drogaria Minas Brasil	\N	f	\N	\N	\N	f	Drogaria Minas Brasil	\N
102	2025-10-30 19:22:33.575863	2025-12-26 14:03:27.640557	1	\N	Pagamento de boleto efetuado ASSOCIACAO PAMPULHA TENNIS	477.00	2025-10-15	debit	68ef821d-172c-4812-a08f-a2cb2c609a77	\N	Pagamento de boleto efetuado - ASSOCIACAO PAMPULHA TENNIS	\N	f	\N	\N	\N	f	Pagamento de boleto efetuado ASSOCIACAO PAMPULHA TENNIS	\N
104	2025-10-30 19:22:33.577765	2025-12-26 14:03:27.641471	1	\N	Resgate RDB	700.00	2025-10-16	credit	68f1476b-b816-42ad-8023-aed3dbfafefa	\N	Resgate RDB	\N	f	\N	\N	\N	f	Resgate RDB	\N
1064	2025-12-29 13:58:36.427776	2025-12-29 13:58:36.427776	3	\N	Nu Seguro Vida	26.25	2025-12-19	debit	69452049-6e71-4024-9dc1-af0a96e67886	\N	Nu Seguro Vida	\N	f	\N	\N	\N	f	Nu Seguro Vida	\N
1063	2025-12-29 13:58:36.425421	2025-12-29 13:58:36.432139	3	\N	IOF de PragmaticengineerCom	27.52	2025-12-19	debit	6944ba0a-eee2-46d8-8459-8f3f004134c0	\N	IOF de "Pragmaticengineer.Com"	\N	f	\N	\N	\N	f	PragmaticengineerCom	\N
1067	2025-12-29 13:58:36.432781	2025-12-29 13:58:36.432781	3	\N	Center Pao	21.51	2025-12-19	debit	694414e7-d17e-4ad9-a176-5a2b22856c10	\N	Center Pao	\N	f	\N	\N	\N	f	Center Pao	\N
1068	2025-12-29 13:58:36.433355	2025-12-29 13:58:36.433355	3	\N	Villefort Atacadista	431.39	2025-12-18	debit	6942a9ca-0380-4fdb-b4c3-97a627f4f01f	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
1069	2025-12-29 13:58:36.434	2025-12-29 13:58:36.434	3	\N	Pagamento recebido	410.31	2025-12-18	credit	69449210-9402-467e-9793-9f4a60c2804b	\N	Pagamento recebido	\N	f	\N	\N	\N	f	Pagamento recebido	\N
1070	2025-12-29 13:58:36.434712	2025-12-29 13:58:36.434712	3	\N	Amazonmktplc*Jackeline	25.80	2025-12-18	debit	6942930e-42dc-44ff-b3f5-96aa531eb95c	\N	Amazonmktplc*Jackeline	\N	f	\N	\N	\N	f	Amazonmktplc*Jackeline	\N
1071	2025-12-29 13:58:36.435339	2025-12-29 13:58:36.435339	3	\N	Amazon	49.42	2025-12-18	debit	69422f97-8b74-4edc-8244-af70717a18bb	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
1072	2025-12-29 13:58:36.435986	2025-12-29 13:58:36.435986	3	\N	Villefort Atacadista	246.04	2025-12-17	debit	69413b4b-5882-460c-ba3c-3157181a373f	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
1074	2025-12-29 13:58:36.437276	2025-12-29 13:58:36.437276	3	\N	Villefort Atacadista	60.00	2025-12-17	debit	69418858-333f-4aa0-afed-a4a6cc623e94	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
1076	2025-12-29 13:58:36.438702	2025-12-29 13:58:36.438702	3	\N	Pb*Malwarebytesc	305.99	2025-12-17	debit	6941424c-3603-42a9-81dc-2f2619fa95bc	\N	Pb*Malwarebytesc	\N	f	\N	\N	\N	f	Pb*Malwarebytesc	\N
1077	2025-12-29 13:58:36.439247	2025-12-29 13:58:36.439247	3	\N	Center Pao	5.49	2025-12-17	debit	694171bc-b381-4392-b0c1-a4cb3788322c	\N	Center Pao	\N	f	\N	\N	\N	f	Center Pao	\N
1078	2025-12-29 13:58:36.439774	2025-12-29 13:58:36.439774	3	\N	Pagamento recebido	940.41	2025-12-17	credit	69431eab-4b8a-4735-9436-11d823e02235	\N	Pagamento recebido	\N	f	\N	\N	\N	f	Pagamento recebido	\N
1079	2025-12-29 13:58:36.440336	2025-12-29 13:58:36.440336	3	\N	Center Pao	20.29	2025-12-17	debit	69417192-0a84-47a6-aa60-35ad95f84f45	\N	Center Pao	\N	f	\N	\N	\N	f	Center Pao	\N
1080	2025-12-29 13:58:36.440953	2025-12-29 13:58:36.440953	3	\N	Mercadofacil	12.37	2025-12-16	debit	693ff8aa-55f0-4c66-8435-d35cbdd55956	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
1081	2025-12-29 13:58:36.441485	2025-12-29 13:58:36.441485	3	\N	Uber NuPay	16.20	2025-12-16	debit	69417b22-e2d3-4c95-91de-3a30b6e60b67	\N	Uber - NuPay	\N	f	\N	\N	\N	f	Uber NuPay	\N
1082	2025-12-29 13:58:36.442027	2025-12-29 13:58:36.442027	3	\N	Cordeiro Supermercados	293.68	2025-12-16	debit	693ff4a0-e3d9-43fe-a44a-38e075d9b1bd	\N	Cordeiro Supermercados	\N	f	\N	\N	\N	f	Cordeiro Supermercados	\N
1083	2025-12-29 13:58:36.442761	2025-12-29 13:58:36.442761	3	\N	Pagamento recebido	924.73	2025-12-16	credit	694141cb-cf2d-4dca-b551-061d344d84a6	\N	Pagamento recebido	\N	f	\N	\N	\N	f	Pagamento recebido	\N
1084	2025-12-29 13:58:36.443449	2025-12-29 13:58:36.443449	3	\N	Uber NuPay	17.03	2025-12-16	debit	6941748f-9c01-445c-afbe-393bafd39373	\N	Uber - NuPay	\N	f	\N	\N	\N	f	Uber NuPay	\N
1085	2025-12-29 13:58:36.444063	2025-12-29 13:58:36.444063	3	\N	Mercadofacil	66.00	2025-12-15	debit	693ef72f-e1a2-4985-ab2a-f133e1884c27	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
1086	2025-12-29 13:58:36.444916	2025-12-29 13:58:36.444916	3	\N	Barbaracristina	35.25	2025-12-15	debit	693ee55a-9664-4a14-bf91-cb3ea63fd76b	\N	Barbaracristina	\N	f	\N	\N	\N	f	Barbaracristina	\N
1087	2025-12-29 13:58:36.445504	2025-12-29 13:58:36.445504	3	\N	Padre Paulo Ricardo	99.90	2025-12-15	debit	693ea327-e90d-4adc-9a19-9c3e55cbbe7d	\N	Padre Paulo Ricardo	\N	f	\N	\N	\N	f	Padre Paulo Ricardo	\N
1088	2025-12-29 13:58:36.446107	2025-12-29 13:58:36.446107	3	\N	Barbaracristina	27.45	2025-12-15	debit	693ede59-cc4d-4dc1-b375-c709e75cd5d1	\N	Barbaracristina	\N	f	\N	\N	\N	f	Barbaracristina	\N
1090	2025-12-29 13:58:36.447504	2025-12-29 13:58:36.447504	3	\N	Villa Espetaria	74.43	2025-12-14	debit	693e19b5-76b9-4821-9715-07e2bbd5bf21	\N	Villa Espetaria	\N	f	\N	\N	\N	f	Villa Espetaria	\N
1091	2025-12-29 13:58:36.448146	2025-12-29 13:58:36.448146	3	\N	Villa Espetaria	6.00	2025-12-14	debit	693dff0b-049b-4a7d-967c-bbe6d6da9962	\N	Villa Espetaria	\N	f	\N	\N	\N	f	Villa Espetaria	\N
1096	2025-12-29 13:58:36.452532	2025-12-29 17:04:13.422839	3	\N	Amazon: LEGO Set Super Heroes Marvel 76276 Armadura Mech Venom vs. Miles Morales 134 peças (Pedido: 702-5312813-6568207)	87.18	2025-12-14	debit	693c9a8e-c98e-4a30-9224-38e35d38f6db	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
1093	2025-12-29 13:58:36.450545	2025-12-29 13:58:36.451926	3	\N	IOF de Discord* Nitromonthly	0.90	2025-12-14	debit	693d84b8-cc92-4736-96cc-31b087450c8e	\N	IOF de "Discord* Nitromonthly"	\N	f	\N	\N	\N	f	Discord* Nitromonthly	\N
1097	2025-12-29 13:58:36.453228	2025-12-29 13:58:36.453228	3	\N	Vittoria Variedades	30.35	2025-12-13	debit	693c17c7-db27-426c-b188-dbbe4ec3c846	\N	Vittoria Variedades	\N	f	\N	\N	\N	f	Vittoria Variedades	\N
1098	2025-12-29 13:58:36.453893	2025-12-29 13:58:36.453893	3	\N	Amazonmktplc*Alexkidsc	171.99	2025-12-13	debit	693b0a2a-5a06-45d3-a42b-f2b2e95477a1	\N	Amazonmktplc*Alexkidsc	\N	f	\N	\N	\N	f	Amazonmktplc*Alexkidsc	\N
1099	2025-12-29 13:58:36.454524	2025-12-29 13:58:36.454524	3	\N	Amazon Marketplace	194.00	2025-12-13	debit	693b0a2d-9b59-40d7-92fe-c8b8aaea22bd	\N	Amazon Marketplace	\N	f	\N	\N	\N	f	Amazon Marketplace	\N
1100	2025-12-29 13:58:36.455139	2025-12-29 13:58:36.455139	3	\N	Center Pao Supermercad	185.03	2025-12-13	debit	693c08b4-3fc9-4d04-91cf-827689cf4964	\N	Center Pao Supermercad	\N	f	\N	\N	\N	f	Center Pao Supermercad	\N
1101	2025-12-29 13:58:36.455683	2025-12-29 13:58:36.455683	3	\N	Mulher Moderna	129.00	2025-12-13	debit	693c02f5-9f38-46c9-b8a8-9d8ccd44eac5	\N	Mulher Moderna	\N	f	\N	\N	\N	f	Mulher Moderna	\N
1102	2025-12-29 13:58:36.456306	2025-12-29 13:58:36.456306	3	\N	AppleCom/Bill	689.00	2025-12-13	debit	693c17b5-9cae-4236-be86-022029c32371	\N	Apple.Com/Bill	\N	f	\N	\N	\N	f	AppleCom/Bill	\N
1103	2025-12-29 13:58:36.456952	2025-12-29 13:58:36.456952	3	\N	Collorfest	83.76	2025-12-13	debit	693c15d9-3291-48ce-bc00-222f03ea02cd	\N	Collorfest	\N	f	\N	\N	\N	f	Collorfest	\N
130	2025-10-30 19:22:33.592082	2025-12-26 14:03:27.654297	1	\N	Pagamento de boleto efetuado (saldo compartilhado) ALLIANZ SEGUROS SA	241.91	2025-10-20	debit	67ffacf3-c7ca-4a1d-9a7a-03926af55496	\N	Pagamento de boleto efetuado (saldo compartilhado) - ALLIANZ SEGUROS SA	\N	f	\N	\N	\N	f	Pagamento de boleto efetuado (saldo compartilhado) ALLIANZ SEGUROS SA	\N
1105	2025-12-29 13:58:36.458171	2025-12-29 13:58:36.458171	3	\N	Amazonmktplc*Mytoypres	98.20	2025-12-13	debit	693b0a25-e229-4a9a-840e-7cdef5d63892	\N	Amazonmktplc*Mytoypres	\N	f	\N	\N	\N	f	Amazonmktplc*Mytoypres	\N
131	2025-10-30 19:22:33.592477	2025-12-26 14:03:27.654787	1	\N	Débito em conta	26.25	2025-10-20	debit	68f60627-5d32-42fc-b93f-a63944d6a864	\N	Débito em conta	\N	f	\N	\N	\N	f	Débito em conta	\N
1106	2025-12-29 13:58:36.458819	2025-12-29 13:58:36.458819	3	\N	Amazon Marketplace	112.41	2025-12-12	debit	693ad724-6387-4eb7-9c85-bb9e95ae9f05	\N	Amazon Marketplace	\N	f	\N	\N	\N	f	Amazon Marketplace	\N
1107	2025-12-29 13:58:36.459522	2025-12-29 13:58:36.459522	3	\N	Cia do Churrasco	97.75	2025-12-12	debit	693aeccc-5a79-404a-9249-047c99159e17	\N	Cia do Churrasco	\N	f	\N	\N	\N	f	Cia do Churrasco	\N
761	2025-12-26 14:40:35.345583	2025-12-30 13:26:25.147662	3	\N	Pagamento de fatura	948.73	2025-12-14	debit	693ea265-ab2f-4b47-8a24-bcd58ceec4c1	\N	Pagamento de fatura	\N	f	\N	\N	\N	f	Pagamento de fatura	\N
1089	2025-12-29 13:58:36.446812	2025-12-29 17:04:13.424529	3	\N	Amazon: LEGO Set Super Heroes Marvel 76276 Armadura Mech Venom vs. Miles Morales 134 peças (Pedido: 702-0075158-8101031)	87.18	2025-12-14	debit	693c9aab-9f62-4fb2-9f84-c2e8d8ab759a	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
1073	2025-12-29 13:58:36.436656	2025-12-29 17:04:13.419117	3	\N	Amazon: Little Women (Heritage Collection) (Pedido: 702-0722627-7317825)	144.04	2025-12-17	debit	6940a163-1909-49fd-baa1-7531fa9443da	\N	Amazon Marketplace	\N	f	\N	\N	\N	f	Amazon Marketplace	\N
1075	2025-12-29 13:58:36.437866	2025-12-30 16:33:13.005183	3	4	Drogaria Minas Brasil	8.80	2025-12-17	debit	69416b39-9bdc-4390-968d-b84097865a40	\N	Drogaria Minas Brasil	\N	f	\N	\N	\N	f	Drogaria Minas Brasil	\N
1108	2025-12-29 13:58:36.460237	2025-12-29 13:58:36.460237	3	\N	Amazon Marketplace	109.79	2025-12-12	debit	693b0a58-250c-4082-914e-f9745c87f930	\N	Amazon Marketplace	\N	f	\N	\N	\N	f	Amazon Marketplace	\N
1109	2025-12-29 13:58:36.460869	2025-12-29 13:58:36.460869	3	\N	Pagamento recebido	2524.09	2025-12-12	credit	693c1607-2e55-44c0-9dcd-d647b59ff453	\N	Pagamento recebido	\N	f	\N	\N	\N	f	Pagamento recebido	\N
1110	2025-12-29 13:58:36.461476	2025-12-29 13:58:36.461476	3	\N	Eduardo Fernandes Ribe	68.00	2025-12-11	debit	6939cf9a-65e3-4210-ad77-736c3574f7cf	\N	Eduardo Fernandes Ribe	\N	f	\N	\N	\N	f	Eduardo Fernandes Ribe	\N
1111	2025-12-29 13:58:36.464405	2025-12-29 13:58:36.464405	3	\N	Lojas Renner Fl	99.90	2025-12-11	debit	69397565-fdfd-47cf-b351-41baa6e8a71f	\N	Lojas Renner Fl	\N	f	\N	\N	\N	f	Lojas Renner Fl	\N
1112	2025-12-29 13:58:36.465077	2025-12-29 13:58:36.465077	3	\N	Octoo Bar	82.13	2025-12-11	debit	69398b1e-6ff1-47bf-8713-202c24637905	\N	Octoo Bar	\N	f	\N	\N	\N	f	Octoo Bar	\N
1113	2025-12-29 13:58:36.465789	2025-12-29 13:58:36.465789	3	\N	Lojasriachuelosa	159.99	2025-12-11	debit	693978a0-45d9-42c2-9c40-962b3dc79c76	\N	Lojasriachuelosa	\N	f	\N	\N	\N	f	Lojasriachuelosa	\N
1114	2025-12-29 13:58:36.466442	2025-12-29 13:58:36.466442	3	\N	Casadecarnes	37.36	2025-12-11	debit	6939c771-eaf9-4242-bcfb-a43a9c5e4d1e	\N	Casadecarnes	\N	f	\N	\N	\N	f	Casadecarnes	\N
1115	2025-12-29 13:58:36.467172	2025-12-29 13:58:36.467172	3	\N	Bomboniere Doce Festa	47.46	2025-12-11	debit	69397de9-e487-4a1a-b589-ab9a68c744d4	\N	Bomboniere Doce Festa	\N	f	\N	\N	\N	f	Bomboniere Doce Festa	\N
1116	2025-12-29 13:58:36.467863	2025-12-29 13:58:36.467863	3	\N	Lupo	75.80	2025-12-11	debit	693976a9-21d6-4582-9c61-a382f154fc4a	\N	Lupo	\N	f	\N	\N	\N	f	Lupo	\N
1117	2025-12-29 13:58:36.468622	2025-12-29 13:58:36.468622	3	\N	Allianz Segu*07 de	235.62	2025-12-11	debit	6939052a-b014-4387-857a-ec9873d9a095	\N	Allianz Segu*07 de	\N	f	\N	\N	\N	f	Allianz Segu*07 de	\N
1118	2025-12-29 13:58:36.469274	2025-12-29 13:58:36.469274	3	\N	Allianz Seguros S/A	235.62	2025-12-11	debit	69397db0-f17d-42f8-aab4-4e07b8718bc2	\N	Allianz Seguros S/A	\N	f	\N	\N	\N	f	Allianz Seguros S/A	\N
1119	2025-12-29 13:58:36.46994	2025-12-29 13:58:36.46994	3	\N	Natelson Souza Junior	17.15	2025-12-11	debit	6939c631-4aee-4ab3-adfe-94efeb85c9e8	\N	Natelson Souza Junior	\N	f	\N	\N	\N	f	Natelson Souza Junior	\N
1120	2025-12-29 13:58:36.470579	2025-12-29 13:58:36.470579	3	\N	Bsb Empreendimentos e	10.00	2025-12-11	debit	69398c54-f90a-44f0-89f0-36caa339d526	\N	Bsb Empreendimentos e	\N	f	\N	\N	\N	f	Bsb Empreendimentos e	\N
1121	2025-12-29 13:58:36.471184	2025-12-29 13:58:36.471184	3	\N	Uzamoc Calcados	142.42	2025-12-11	debit	69398131-6b22-459e-bcb7-be8f6048a9d6	\N	Uzamoc Calcados	\N	f	\N	\N	\N	f	Uzamoc Calcados	\N
1122	2025-12-29 13:58:36.471903	2025-12-29 13:58:36.471903	3	\N	Mercadofacil	46.50	2025-12-10	debit	69380def-5efc-4754-bbd5-535bd143d316	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
1123	2025-12-29 13:58:36.472575	2025-12-29 13:58:36.472575	3	\N	Amazon	344.45	2025-12-10	debit	693767aa-b38f-4da2-98be-48c15f6914fd	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
1124	2025-12-29 13:58:36.473259	2025-12-29 13:58:36.473259	3	\N	AppleCom/Bill	19.90	2025-12-10	debit	6937b1f4-42ba-4c1d-86a0-40d9d18bee8f	\N	Apple.Com/Bill	\N	f	\N	\N	\N	f	AppleCom/Bill	\N
1125	2025-12-29 13:58:36.473985	2025-12-29 13:58:36.473985	3	\N	Havan Montes Claros	64.95	2025-12-10	debit	6938562f-b5a7-468a-a1fa-df94f6b08888	\N	Havan Montes Claros	\N	f	\N	\N	\N	f	Havan Montes Claros	\N
1126	2025-12-29 13:58:36.476575	2025-12-29 13:58:36.476575	3	\N	Amazon	107.40	2025-12-10	debit	693767b3-fea1-456f-8629-5815a115b14d	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
1127	2025-12-29 13:58:36.47735	2025-12-29 13:58:36.47735	3	\N	Villefort Atacadista	65.76	2025-12-10	debit	69386111-754b-4d47-be30-3565c6870500	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
1130	2025-12-29 13:58:36.479296	2025-12-29 13:58:36.479296	3	\N	Arautos D0004821426	260.00	2025-12-09	debit	69376803-bbee-4739-8d10-96e396dfd0af	\N	Arautos D0004821426	\N	f	\N	\N	\N	f	Arautos D0004821426	\N
1132	2025-12-29 13:58:36.480504	2025-12-29 13:58:36.480504	3	\N	Villefort Atacadista	147.44	2025-12-09	debit	69373072-efc4-404e-812a-f1c957bc84a4	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
1129	2025-12-29 13:58:36.478621	2025-12-29 13:58:36.481139	3	\N	Cursor, Ai Powered Ide	112.30	2025-12-09	debit	6936e3b7-5a10-4695-abc7-e796e0aeb647	\N	Cursor, Ai Powered Ide	\N	f	\N	\N	\N	f	IOF de Cursor, Ai Powered Ide	\N
1134	2025-12-29 13:58:36.481785	2025-12-29 13:58:36.481785	3	\N	Villefort Atacadista	195.09	2025-12-08	debit	69357a5a-d10c-40a3-ae50-812cccdfb1f5	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
1135	2025-12-29 13:58:36.485143	2025-12-29 13:58:36.485143	3	\N	Alisson Tiago Ribeiro	135.00	2025-12-08	debit	69356633-73ac-4aa4-8920-79b750a006b2	\N	Alisson Tiago Ribeiro	\N	f	\N	\N	\N	f	Alisson Tiago Ribeiro	\N
1136	2025-12-29 13:58:36.485806	2025-12-29 13:58:36.485806	3	\N	Amazon	26.63	2025-12-07	debit	6933d395-cac7-4e22-b98b-1c4a6227d2fb	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
1137	2025-12-29 13:58:36.48642	2025-12-29 13:58:36.48642	3	\N	Ifd*Pizzaria Bom Gosto	89.89	2025-12-07	debit	69338082-611b-49b7-8111-d25dc1a03106	\N	Ifd*Pizzaria Bom Gosto	\N	f	\N	\N	\N	f	Ifd*Pizzaria Bom Gosto	\N
1139	2025-12-29 13:58:36.487651	2025-12-29 13:58:36.487651	3	\N	Havan Montes Claros	450.89	2025-12-07	debit	69344d01-e9a3-4a10-a4bb-d6cb2f6bbd82	\N	Havan Montes Claros	\N	f	\N	\N	\N	f	Havan Montes Claros	\N
1140	2025-12-29 13:58:36.488411	2025-12-29 13:58:36.488411	3	\N	Amazonmktplc*Buydreams	125.90	2025-12-07	debit	69332b89-3225-40f4-a517-84a4114f9355	\N	Amazonmktplc*Buydreams	\N	f	\N	\N	\N	f	Amazonmktplc*Buydreams	\N
1141	2025-12-29 13:58:36.489046	2025-12-29 13:58:36.489046	3	\N	Amazon	474.36	2025-12-07	debit	6933d39a-b6f1-4732-842d-1fbe90317527	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
1143	2025-12-29 13:58:36.490228	2025-12-29 13:58:36.490228	3	\N	Mercadofacil	31.48	2025-12-06	debit	6932c8e4-debc-491a-930d-c8185fdb93dd	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
1144	2025-12-29 13:58:36.490851	2025-12-29 13:58:36.490851	3	\N	Villefort Atacadista	262.58	2025-12-06	debit	6932f266-74d7-43ba-9029-da519fd98ed2	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
162	2025-10-30 19:22:38.083079	2025-10-30 19:22:38.083079	1	\N	 - Sineia Ferreira Aquino	69.80	2025-10-30	debit	69022176-7631-444a-aca9-186fc641591d	\N	Sineia Ferreira Aquino	\N	f	\N	\N	\N	f	 - Sineia Ferreira Aquino	\N
1145	2025-12-29 13:58:36.491588	2025-12-29 13:58:36.491588	3	\N	Avellinos Pizzaria	172.50	2025-12-06	debit	69336204-1885-48d4-9ae4-0cf94d06fb50	\N	Avellinos Pizzaria	\N	f	\N	\N	\N	f	Avellinos Pizzaria	\N
1146	2025-12-29 13:58:36.492358	2025-12-29 13:58:36.492358	3	\N	Casadecarnes	31.00	2025-12-05	debit	6931d1a3-4638-455a-aabc-8cee225ff71f	\N	Casadecarnes	\N	f	\N	\N	\N	f	Casadecarnes	\N
1147	2025-12-29 13:58:36.493131	2025-12-29 13:58:36.493131	3	\N	Natelson Souza Junior	13.26	2025-12-05	debit	6931d0a4-de14-4ea7-ae8d-189f2d2c4148	\N	Natelson Souza Junior	\N	f	\N	\N	\N	f	Natelson Souza Junior	\N
1149	2025-12-29 13:58:36.494749	2025-12-29 13:58:36.494749	3	\N	EBW*Spotify NuPay	40.90	2025-12-04	debit	69316a38-c9e6-406a-ad3c-6f56b6f5496a	\N	EBW*Spotify - NuPay	\N	f	\N	\N	\N	f	EBW*Spotify NuPay	\N
1150	2025-12-29 13:58:36.495515	2025-12-29 13:58:36.495515	3	\N	00174 Sh Montes Claro	159.90	2025-12-03	debit	692f3248-4d16-4fa3-b64f-1f51a160bda3	\N	00174 Sh Montes Claro	\N	f	\N	\N	\N	f	00174 Sh Montes Claro	\N
1151	2025-12-29 13:58:36.496189	2025-12-29 13:58:36.496189	3	\N	Cordeiro Supermercados	549.75	2025-12-03	debit	692ef196-1a7a-48aa-a281-c66fbe937c29	\N	Cordeiro Supermercados	\N	f	\N	\N	\N	f	Cordeiro Supermercados	\N
163	2025-10-30 19:22:38.08683	2025-10-30 19:22:38.08683	1	\N	 - Amazon	212.39	2025-10-30	debit	69037c5e-e76e-4059-9838-f348cd63c0ba	\N	Amazon	\N	f	\N	\N	\N	f	 - Amazon	\N
164	2025-10-30 19:22:38.088446	2025-10-30 19:22:38.088446	1	\N	 - Mercadofacil	7.62	2025-10-30	debit	69035a69-6443-401a-b326-e4db548c559d	\N	Mercadofacil	\N	f	\N	\N	\N	f	 - Mercadofacil	\N
166	2025-10-30 19:22:38.091363	2025-10-30 19:22:38.091363	1	\N	 - Pagamento recebido	866.14	2025-10-29	credit	69021d35-d5b6-4f53-acb7-0b845c763953	\N	Pagamento recebido	\N	f	\N	\N	\N	f	 - Pagamento recebido	\N
168	2025-10-30 19:22:38.093348	2025-10-30 19:22:38.093348	1	\N	 - Amazonprimebr	19.90	2025-10-29	debit	690015df-9029-4b1c-9c01-23231609eb6b	\N	Amazonprimebr	\N	f	\N	\N	\N	f	 - Amazonprimebr	\N
1152	2025-12-29 13:58:36.496864	2025-12-29 13:58:36.496864	3	\N	Bsb Empreendimentos e	10.00	2025-12-03	debit	692f4568-993f-4437-8ca5-048933deafab	\N	Bsb Empreendimentos e	\N	f	\N	\N	\N	f	Bsb Empreendimentos e	\N
1153	2025-12-29 13:58:36.499541	2025-12-29 13:58:36.499541	3	\N	Patricia Bicalho Viei	19.90	2025-12-03	debit	692ee395-07ed-40e9-876f-aeb8b195bf9a	\N	Patricia Bicalho Viei	\N	f	\N	\N	\N	f	Patricia Bicalho Viei	\N
1154	2025-12-29 13:58:36.500174	2025-12-29 13:58:36.500174	3	\N	Mulher Moderna	40.00	2025-12-03	debit	692ed4eb-52c0-4f52-9c54-8f5a668e2098	\N	Mulher Moderna	\N	f	\N	\N	\N	f	Mulher Moderna	\N
1155	2025-12-29 13:58:36.500895	2025-12-29 13:58:36.500895	3	\N	Google One	9.99	2025-12-03	debit	692dbac1-8dc4-4409-a076-b91185bf03b4	\N	Google One	\N	f	\N	\N	\N	f	Google One	\N
1157	2025-12-29 13:58:36.50261	2025-12-29 13:58:36.50261	3	\N	Esfiha Express	56.58	2025-12-03	debit	692f4429-ef18-4c68-aa82-5f31694b2f81	\N	Esfiha Express	\N	f	\N	\N	\N	f	Esfiha Express	\N
1158	2025-12-29 13:58:36.503326	2025-12-29 13:58:36.503326	3	\N	Franciscoalvesdos	22.00	2025-12-02	debit	692de894-9a23-44e6-9422-41123f3995a4	\N	Franciscoalvesdos	\N	f	\N	\N	\N	f	Franciscoalvesdos	\N
1160	2025-12-29 13:58:36.504659	2025-12-29 13:58:36.504659	3	\N	Paroquia Nossa Senhora	8.00	2025-12-01	debit	692c35d1-322d-4d14-8a81-2b164f77c7ba	\N	Paroquia Nossa Senhora	\N	f	\N	\N	\N	f	Paroquia Nossa Senhora	\N
1161	2025-12-29 13:58:36.505461	2025-12-29 13:58:36.505461	3	\N	Drogaria Esplanada	9.00	2025-12-01	debit	692c4acc-6842-4f94-a46d-820204482357	\N	Drogaria Esplanada	\N	f	\N	\N	\N	f	Drogaria Esplanada	\N
1162	2025-12-29 13:58:36.506178	2025-12-29 13:58:36.506178	3	\N	Posto Esplanada	270.12	2025-12-01	debit	692c489c-c92d-4bb6-8834-4fa42ed98706	\N	Posto Esplanada	\N	f	\N	\N	\N	f	Posto Esplanada	\N
1163	2025-12-29 13:58:36.506847	2025-12-29 13:58:36.506847	3	\N	Casadecarnes	49.50	2025-11-30	debit	692b038c-5f10-48e1-8640-024ce0f9d6be	\N	Casadecarnes	\N	f	\N	\N	\N	f	Casadecarnes	\N
1164	2025-12-29 13:58:36.510963	2025-12-29 13:58:36.510963	3	\N	Amazon	231.48	2025-11-30	debit	6929db3a-1f06-48fa-971e-1cc0d44f75ad	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
1165	2025-12-29 13:58:36.511764	2025-12-29 13:58:36.511764	3	\N	Amazonmktplc*Dicoldist	22.01	2025-11-30	debit	692835a6-2c4f-46ed-bfe9-e2d530cf7b7d	\N	Amazonmktplc*Dicoldist	\N	f	\N	\N	\N	f	Amazonmktplc*Dicoldist	\N
1166	2025-12-29 13:58:36.512436	2025-12-29 13:58:36.512436	3	\N	Amazon	40.99	2025-11-30	debit	6929db40-40aa-4a54-90d2-7fb014f0f01b	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
1167	2025-12-29 13:58:36.513131	2025-12-29 13:58:36.513131	3	\N	58672998bernardo	77.29	2025-11-30	debit	692b152f-1074-473f-8a81-46a378c955c2	\N	58672998bernardo	\N	f	\N	\N	\N	f	58672998bernardo	\N
1168	2025-12-29 13:58:36.513928	2025-12-29 13:58:36.513928	3	\N	Pex*Vivianne Romanholo	16.35	2025-11-29	debit	6929f05f-7c11-445a-a9a9-96e7bcae7f79	\N	Pex*Vivianne Romanholo	\N	f	\N	\N	\N	f	Pex*Vivianne Romanholo	\N
1170	2025-12-29 13:58:36.515295	2025-12-29 13:58:36.515295	3	\N	Mercadofacil	11.34	2025-11-29	debit	692a23d6-f9a7-4098-b9ea-5308f6b8de06	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
1171	2025-12-29 13:58:36.515949	2025-12-29 13:58:36.515949	3	\N	Center Pao Supermercad	149.31	2025-11-29	debit	6929dee9-59d7-4bff-9c2d-43fb4aac6da5	\N	Center Pao Supermercad	\N	f	\N	\N	\N	f	Center Pao Supermercad	\N
1172	2025-12-29 13:58:36.51661	2025-12-29 13:58:36.51661	3	\N	Amazon	1236.00	2025-11-29	debit	69292de6-59ea-4ee1-a0e5-7327ec98c2a7	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
1173	2025-12-29 13:58:36.517536	2025-12-29 13:58:36.517536	3	\N	Mercadofacil	19.50	2025-11-29	debit	69298a35-df04-4a78-9879-a7da78419ad7	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
1174	2025-12-29 13:58:36.518483	2025-12-29 13:58:36.518483	3	\N	Marron Glace	36.75	2025-11-28	debit	69283da0-c7ba-4595-86af-8e2f7adaac1a	\N	Marron Glace	\N	f	\N	\N	\N	f	Marron Glace	\N
1175	2025-12-29 13:58:36.519328	2025-12-29 13:58:36.519328	3	\N	Eduardo Fernandes Ribe	51.00	2025-11-28	debit	69283cbd-adc2-4261-8a9b-34fdacaab12e	\N	Eduardo Fernandes Ribe	\N	f	\N	\N	\N	f	Eduardo Fernandes Ribe	\N
1176	2025-12-29 13:58:36.520044	2025-12-29 13:58:36.520044	3	\N	Plano NuCel 45GB	45.00	2025-11-27	debit	692892ac-8d20-4ac9-9231-1de154e595f7	\N	Plano NuCel 45GB	\N	f	\N	\N	\N	f	Plano NuCel 45GB	\N
1178	2025-12-29 13:58:36.521506	2025-12-29 13:58:36.521506	3	\N	Salao Tio Ronaldo Kid	70.00	2025-11-27	debit	69275af8-7245-406f-8150-bac5656fd13b	\N	Salao Tio Ronaldo Kid	\N	f	\N	\N	\N	f	Salao Tio Ronaldo Kid	\N
1179	2025-12-29 13:58:36.522306	2025-12-29 13:58:36.522306	3	\N	Amazon	19.63	2025-11-27	debit	69273389-2f6e-46b6-a3f3-0190e939a35e	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
1169	2025-12-29 13:58:36.514609	2025-12-29 19:11:10.953679	3	50	Amazon Prime	19.90	2025-11-29	debit	6928f1cf-3379-4a63-849b-0a8ecca651b7	\N	Amazonprimebr	\N	f	\N	\N	\N	f	Amazonprimebr	\N
1159	2025-12-29 13:58:36.504017	2025-12-30 16:33:13.008372	3	4	Drogaria Minas Brasil	73.92	2025-12-01	debit	692c49e3-c70d-466c-bd7b-e4448851956c	\N	Drogaria Minas Brasil	\N	f	\N	\N	\N	f	Drogaria Minas Brasil	\N
186	2025-10-30 19:22:41.786562	2025-11-08 16:55:46.541591	1	\N	Amazon Marketplace	87.43	2025-10-26	debit	68fac076-07bf-43fd-9951-73260782ef8e	\N	Amazon Marketplace	\N	f	\N	\N	\N	f	Amazon Marketplace	\N
1192	2025-12-29 13:59:26.599716	2025-12-29 13:59:26.599716	3	\N	Pizzaria Berutti	101.00	2025-12-28	debit	695071af-f519-4446-ac66-b58290cb99a6	\N	Pizzaria Berutti	\N	f	\N	\N	\N	f	Pizzaria Berutti	\N
1193	2025-12-29 13:59:26.600604	2025-12-29 13:59:26.600604	3	\N	Villefort Atacadista	129.93	2025-12-28	debit	694fe00a-cbeb-4144-a596-b3d0049f4824	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
1189	2025-12-29 13:59:26.596209	2025-12-29 13:59:26.605573	3	\N	IOF de compra internacional	4.24	2025-12-28	debit	694fbc2c-37b6-426d-9edc-6ec93777d170	\N	IOF de compra internacional	\N	f	\N	\N	\N	f	Cursor Usage Mid Dec	\N
1185	2025-12-29 13:59:26.5919	2025-12-29 19:11:10.923792	3	50	Amazon Prime	19.90	2025-12-29	debit	695083fe-2de9-4e19-93bc-8033b5f08f0f	\N	Amazonprimebr	\N	f	\N	\N	\N	f	Amazonprimebr	\N
1184	2025-12-29 13:59:26.588284	2025-12-30 16:30:08.827814	3	54	Farroupilha Restaurante	268.73	2025-12-29	debit	695165c5-e0b0-4c14-b8ce-ea7ebf368a0d	\N	Farroupilha Restaurant	\N	f	\N	\N	\N	f	Farroupilha Restaurant	\N
1195	2025-12-29 13:59:26.602387	2025-12-30 16:32:39.306786	3	55	Amazon: LEGO Set City Police 60415 Perseguição de Carro da Polícia a Muscle 213 peças (Pedido: 702-2839085-1887447)	165.99	2025-12-28	debit	694f273e-6339-423a-b527-0d3f9675ed7c	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
1196	2025-12-29 13:59:26.603289	2025-12-30 16:33:12.997376	3	4	Drogaria Minas Brasil	11.04	2025-12-28	debit	694fe187-8a66-42e5-9c26-abc23e947c91	\N	Drogaria Minas Brasil	\N	f	\N	\N	\N	f	Drogaria Minas Brasil	\N
239	2025-10-30 19:22:41.825689	2025-11-08 16:55:46.575027	1	\N	Mercadofacil	39.00	2025-10-11	debit	68e8f0ed-2794-4581-a599-0ed974453272	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
1059	2025-12-29 13:58:36.422627	2025-12-29 17:04:13.416735	3	\N	Amazon: MamyPoko Lenços Umedecidos Toque Suave 200 Unidades (Pedido: 702-9430385-3852206)	79.50	2025-12-20	debit	69453cf6-95bd-4693-a421-dde15ef4f341	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
728	2025-12-26 14:40:35.300219	2025-12-30 13:26:25.063973	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	100.00	2025-12-02	debit	692ec7e4-5c24-4e31-b5e3-5cb9eb8497b4	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
750	2025-12-26 14:40:35.334508	2025-12-30 13:26:25.122044	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	260.00	2025-12-09	debit	6938c491-f429-4251-a5b2-af7ce6ba2aa4	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
769	2025-12-26 14:40:35.353776	2025-12-30 13:26:25.15314	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	2.62	2025-12-16	debit	6941b67a-1e17-4ae5-8df2-e930fcc5d08b	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
802	2025-12-26 14:40:35.384983	2025-12-30 13:26:25.178039	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	25.00	2025-12-25	debit	694d4691-d436-406e-a319-c46372f556c0	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
1280	2025-12-30 13:26:30.612054	2025-12-30 13:26:30.612054	3	\N	Resgate RDB	2100.00	2025-12-01	credit	692e2236-a39f-47ed-98df-2e58887d34c4	\N	Resgate RDB	\N	f	\N	\N	\N	f	Resgate RDB	\N
1281	2025-12-30 13:26:30.615193	2025-12-30 13:26:30.615193	3	\N	Transferência enviada pelo Pix DARDIANE ALVES SANTA ROSA •••186566•• CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 12880000007672689216	2200.00	2025-12-01	debit	692e2270-28c1-44eb-b4e0-3bd95798f95c	\N	Transferência enviada pelo Pix - DARDIANE ALVES SANTA ROSA - •••.186.566-•• - CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 1288000000767268921-6	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix DARDIANE ALVES SANTA ROSA •••186566•• CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 12880000007672689216	\N
1285	2025-12-30 13:26:30.62647	2025-12-30 13:26:30.62647	3	\N	Transferência enviada pelo Pix Vitor Antunes da Silva •••344336•• ITAÚ UNIBANCO SA (0341) Agência: 6804 Conta: 140553	700.00	2025-12-09	debit	69381e81-9a6a-4713-87f9-5aeb59ef148b	\N	Transferência enviada pelo Pix - Vitor Antunes da Silva - •••.344.336-•• - ITAÚ UNIBANCO S.A. (0341) Agência: 6804 Conta: 14055-3	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Vitor Antunes da Silva •••344336•• ITAÚ UNIBANCO SA (0341) Agência: 6804 Conta: 140553	\N
1286	2025-12-30 13:26:30.628313	2025-12-30 13:26:30.628313	3	\N	Transferência enviada pelo Pix Allysson Steve Mota Lacerda •••388186•• MERCADO PAGO IP LTDA (0323) Agência: 1 Conta: 57987368558	312.06	2025-12-09	debit	69381f70-4e55-4254-a910-90483c64230b	\N	Transferência enviada pelo Pix - Allysson Steve Mota Lacerda - •••.388.186-•• - MERCADO PAGO IP LTDA. (0323) Agência: 1 Conta: 5798736855-8	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Allysson Steve Mota Lacerda •••388186•• MERCADO PAGO IP LTDA (0323) Agência: 1 Conta: 57987368558	\N
1282	2025-12-30 13:26:30.617827	2025-12-30 14:46:33.570508	3	53	Salário	21504.25	2025-12-03	credit	69305d0f-7f14-4aea-a85f-3fdc7240c419	\N	Transferência recebida pelo Pix - Wise Brasil Corretora de Câmbio Ltda. - 36.588.217/0001-01 - BCO VOTORANTIM S.A. (0655) Agência: 1 Conta: 1146184-5	\N	f	\N	\N	\N	f	Transferência recebida pelo Pix Wise Brasil Corretora de Câmbio Ltda 36588217/000101 BCO VOTORANTIM SA (0655) Agência: 1 Conta: 11461845	\N
1283	2025-12-30 13:26:30.620335	2025-12-30 14:46:33.579205	3	53	Salário	22576.34	2025-12-03	credit	69305d65-40ea-4770-a6a2-ed1dc1783b2d	\N	Transferência recebida pelo Pix - Wise Brasil Corretora de Câmbio Ltda. - 36.588.217/0001-01 - BCO VOTORANTIM S.A. (0655) Agência: 1 Conta: 1146184-5	\N	f	\N	\N	\N	f	Transferência recebida pelo Pix Wise Brasil Corretora de Câmbio Ltda 36588217/000101 BCO VOTORANTIM SA (0655) Agência: 1 Conta: 11461845	\N
1279	2025-12-30 13:26:25.184824	2025-12-30 16:29:52.771287	3	\N	Transferência enviada pelo Pix DALMIR FERREIRA DA SILVA •••384886•• PICPAY (0380) Agência: 1 Conta: 945339410	230.00	2025-12-29	debit	6952ae4f-c8ed-48a8-83a6-0c597af48e3d	\N	Transferência enviada pelo Pix - DALMIR FERREIRA DA SILVA - •••.384.886-•• - PICPAY (0380) Agência: 1 Conta: 94533941-0	\N	f	\N	\N	\N	t	Transferência enviada pelo Pix DALMIR FERREIRA DA SILVA •••384886•• PICPAY (0380) Agência: 1 Conta: 945339410	\N
1278	2025-12-30 13:26:25.183528	2025-12-30 16:29:56.323499	3	\N	Resgate RDB	230.00	2025-12-29	credit	6952ae2e-2874-432e-8631-70748f08ce01	\N	Resgate RDB	\N	f	\N	\N	\N	t	Resgate RDB	\N
1277	2025-12-30 13:26:25.182916	2025-12-30 16:30:53.491369	3	2	Lavagem do Carro	50.00	2025-12-28	debit	69518cc4-b552-416b-9618-0e180191e37c	\N	Transferência enviada pelo Pix - Nelson Pereira da Silva - •••.491.156-•• - CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 1288000000869256901-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Nelson Pereira da Silva •••491156•• CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 12880000008692569010	\N
1276	2025-12-30 13:26:25.18122	2025-12-30 16:32:20.134237	3	55	Oferta - Arautos	30.00	2025-12-28	debit	69517b20-e811-4272-8171-4f081c4570c0	\N	Transferência enviada pelo Pix - Associacao Brasileira Arautos do Evangelho - 03.988.329/0013-34 - BCO BRADESCO S.A. (0237) Agência: 3496 Conta: 15532-2	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Associacao Brasileira Arautos do Evangelho 03988329/001334 BCO BRADESCO SA (0237) Agência: 3496 Conta: 155322	\N
610	2025-12-26 14:40:31.609459	2025-12-29 13:46:21.009744	3	\N	Uber NuPay	23.22	2025-11-21	debit	69205b7c-b85e-4a66-8946-e5695a3492f8	\N	Uber - NuPay	\N	f	\N	\N	\N	f	Uber NuPay	\N
611	2025-12-26 14:40:31.611873	2025-12-29 13:46:21.010192	3	\N	Starlink Internet	270.00	2025-11-20	debit	691d7b4c-e795-4a6e-b6c0-ded51f15e935	\N	Starlink Internet	\N	f	\N	\N	\N	f	Starlink Internet	\N
1287	2025-12-30 13:26:30.629992	2025-12-30 13:26:30.629992	3	\N	Transferência enviada pelo Pix CEF MATRIZ 00360305/000104 CAIXA ECONOMICA FEDERAL (0104) Agência: 647 Conta: 99990005370003603055	313.16	2025-12-18	debit	69449434-6b8d-4286-a935-4b66df26901b	\N	Transferência enviada pelo Pix - CEF MATRIZ - 00.360.305/0001-04 - CAIXA ECONOMICA FEDERAL (0104) Agência: 647 Conta: 9999000537000360305-5	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix CEF MATRIZ 00360305/000104 CAIXA ECONOMICA FEDERAL (0104) Agência: 647 Conta: 99990005370003603055	\N
1288	2025-12-30 13:26:30.635891	2025-12-30 13:26:30.635891	3	\N	Transferência enviada pelo Pix RECEITA FEDERAL 00394460/005887 ITAÚ UNIBANCO SA (0341) Agência: 332 Conta: 810100	381.47	2025-12-18	debit	69449443-024d-4dd8-a4bd-51d37e2582eb	\N	Transferência enviada pelo Pix - RECEITA FEDERAL - 00.394.460/0058-87 - ITAÚ UNIBANCO S.A. (0341) Agência: 332 Conta: 81010-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix RECEITA FEDERAL 00394460/005887 ITAÚ UNIBANCO SA (0341) Agência: 332 Conta: 810100	\N
1289	2025-12-30 13:26:30.638277	2025-12-30 13:26:30.638277	3	\N	Transferência enviada pelo Pix RECEITA FEDERAL 00394460/005887 BCO DO BRASIL SA (0001) Agência: 1607 Conta: 3336662	2305.10	2025-12-18	debit	694494cb-8230-41dd-9ea2-9dcfa1a6a9ef	\N	Transferência enviada pelo Pix - RECEITA FEDERAL - 00.394.460/0058-87 - BCO DO BRASIL S.A. (0001) Agência: 1607 Conta: 333666-2	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix RECEITA FEDERAL 00394460/005887 BCO DO BRASIL SA (0001) Agência: 1607 Conta: 3336662	\N
1290	2025-12-30 13:26:30.640278	2025-12-30 13:26:30.640278	3	\N	Transferência enviada pelo Pix RECEITA FEDERAL 00394460/005887 ITAÚ UNIBANCO SA (0341) Agência: 332 Conta: 810100	209.25	2025-12-18	debit	694494fb-213c-4376-beb3-3458734d1977	\N	Transferência enviada pelo Pix - RECEITA FEDERAL - 00.394.460/0058-87 - ITAÚ UNIBANCO S.A. (0341) Agência: 332 Conta: 81010-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix RECEITA FEDERAL 00394460/005887 ITAÚ UNIBANCO SA (0341) Agência: 332 Conta: 810100	\N
1291	2025-12-30 13:26:30.642255	2025-12-30 13:27:18.807161	3	\N	Transferência enviada pelo Pix DARDIANE ALVES SANTA ROSA •••186566•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 278860389	2169.19	2025-12-18	debit	6944966e-ea73-4a0a-b1ed-02c3a611faed	\N	Transferência enviada pelo Pix - DARDIANE ALVES SANTA ROSA - •••.186.566-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 27886038-9	\N	f	\N	\N	\N	t	Transferência enviada pelo Pix DARDIANE ALVES SANTA ROSA •••186566•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 278860389	\N
1292	2025-12-30 13:26:30.644559	2025-12-30 13:27:22.564726	3	\N	Estorno Transferência enviada pelo Pix DARDIANE ALVES SANTA ROSA •••186566•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 278860389	2169.19	2025-12-18	credit	6944966e-ea73-4a0a-b1ed-02c3a611faed:reversal	\N	Estorno - Transferência enviada pelo Pix - DARDIANE ALVES SANTA ROSA - •••.186.566-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 27886038-9	\N	f	\N	\N	\N	t	Estorno Transferência enviada pelo Pix DARDIANE ALVES SANTA ROSA •••186566•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 278860389	\N
1284	2025-12-30 13:26:30.622978	2025-12-30 13:30:05.587159	3	\N	Transferência enviada pelo Pix LUCAS ALMEIDA AGUIAR •••115146•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 162415414	37000.00	2025-12-03	debit	69305e86-fbfc-4200-950c-6d5b38aa820f	\N	Transferência enviada pelo Pix - LUCAS ALMEIDA AGUIAR - •••.115.146-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 16241541-4	\N	f	\N	\N	\N	t	Transferência enviada pelo Pix LUCAS ALMEIDA AGUIAR •••115146•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 162415414	\N
1293	2025-12-30 13:26:30.646872	2025-12-30 18:13:12.406814	3	52	Salário - Dardiane	2169.19	2025-12-18	debit	69449698-5eee-4d8b-94d2-b71a8a3e6649	\N	Transferência enviada pelo Pix - Dardiane Alves Santa Rosa - •••.186.566-•• - CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 1288000000767268921-6	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Dardiane Alves Santa Rosa •••186566•• CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 12880000007672689216	\N
661	2025-12-26 14:40:31.669102	2025-12-29 13:46:21.037176	3	\N	62338947rizalucia	197.00	2025-11-10	debit	6910c806-273d-4680-9b5d-5642729fc8aa	\N	62338947rizalucia	\N	f	\N	\N	\N	f	62338947rizalucia	\N
662	2025-12-26 14:40:31.669777	2025-12-29 13:46:21.037683	3	\N	Pagamento recebido	2235.18	2025-11-10	credit	6911fa5a-05ba-4200-94fa-0022678f7ecb	\N	Pagamento recebido	\N	f	\N	\N	\N	f	Pagamento recebido	\N
876	2025-12-26 14:42:38.274815	2025-12-30 16:30:53.502699	3	2	Lavagem do Carro	40.00	2025-10-27	debit	68ffe0cd-8ace-43e4-b3f2-b1e393ea6c2a	\N	Transferência enviada pelo Pix - Nelson Pereira da Silva - •••.491.156-•• - CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 1288000000869256901-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Nelson Pereira da Silva •••491156•• CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 12880000008692569010	\N
824	2025-12-26 14:42:38.208813	2025-12-30 16:30:53.512312	3	2	Lavagem do Carro	40.00	2025-10-14	debit	68eec692-24b3-451e-9d75-6313bf442959	\N	Transferência enviada pelo Pix - Nelson Pereira da Silva - •••.491.156-•• - CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 1288000000869256901-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Nelson Pereira da Silva •••491156•• CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 12880000008692569010	\N
646	2025-12-26 14:40:31.661124	2025-12-29 13:46:21.029173	3	\N	Nortepec	49.00	2025-11-13	debit	6914cdb7-335e-4286-891b-6e57aa887718	\N	Nortepec	\N	f	\N	\N	\N	f	Nortepec	\N
83	2025-10-30 19:22:33.563149	2025-12-26 14:03:27.631273	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	31.90	2025-10-02	debit	68df0efc-f3c3-4d09-b404-d6fb45dc7893	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
84	2025-10-30 19:22:33.564426	2025-12-26 14:03:27.631856	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	93.32	2025-10-03	debit	68dfbc6a-234b-456b-90a5-8b7072d77660	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
85	2025-10-30 19:22:33.565578	2025-12-26 14:03:27.632476	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	123.37	2025-10-03	debit	68e00e44-0231-47b7-9229-55bfe676900d	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
179	2025-10-30 19:22:41.776802	2025-11-08 16:56:32.664863	1	50	Plano NuCel 45GB	45.00	2025-10-27	debit	68ffbea8-b075-4b71-9578-b5a25f7d8447	\N	Plano NuCel 45GB	\N	f	\N	\N	\N	f	Plano NuCel 45GB	\N
86	2025-10-30 19:22:33.566333	2025-12-26 14:03:27.633025	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	112.37	2025-10-06	debit	68e45f07-a5b1-497c-97a3-770f3a75d4ee	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
87	2025-10-30 19:22:33.567381	2025-12-26 14:03:27.63352	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	102.39	2025-10-06	debit	68e45f63-a647-4d65-8b07-113f891afdb8	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
88	2025-10-30 19:22:33.567966	2025-12-26 14:03:27.634014	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	68.00	2025-10-07	debit	68e56a3c-3157-43e6-b6e4-f40bb0cd8c23	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
90	2025-10-30 19:22:33.568919	2025-12-26 14:03:27.634897	1	\N	Transferência enviada pelo Pix Diego Neri de Castro •••652806•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 482173264	620.00	2025-10-08	debit	68e68527-f908-4513-9976-2291c9e9de4b	\N	Transferência enviada pelo Pix - Diego Neri de Castro - •••.652.806-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 48217326-4	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Diego Neri de Castro •••652806•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 482173264	\N
91	2025-10-30 19:22:33.569431	2025-12-26 14:03:27.635391	1	\N	Transferência Recebida CHRISTIAN FERREIRA CABRAL 46479098838 42306703/000192 NU PAGAMENTOS IP (0260) Agência: 1 Conta: 267128461	1485.00	2025-10-09	credit	68e8107d-55fa-4cff-a589-35cb4f480e77	\N	Transferência Recebida - CHRISTIAN FERREIRA CABRAL 46479098838 - 42.306.703/0001-92 - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 26712846-1	\N	f	\N	\N	\N	f	Transferência Recebida CHRISTIAN FERREIRA CABRAL 46479098838 42306703/000192 NU PAGAMENTOS IP (0260) Agência: 1 Conta: 267128461	\N
92	2025-10-30 19:22:33.569869	2025-12-26 14:03:27.635847	1	\N	Transferência de saldo NuInvest	21.25	2025-10-10	credit	68e8f798-59e6-44ad-96ed-c9b6498e224f	\N	Transferência de saldo NuInvest	\N	f	\N	\N	\N	f	Transferência de saldo NuInvest	\N
93	2025-10-30 19:22:33.570303	2025-12-26 14:03:27.636247	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	150.00	2025-10-10	debit	68e93c4f-33cc-4723-b8b1-d4bf172231c3	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
94	2025-10-30 19:22:33.57073	2025-12-26 14:03:27.636709	1	\N	Transferência enviada pelo Pix Victor Augusto de Azevedo Ferreira •••827896•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 427962536	250.00	2025-10-10	debit	68e96a49-467d-43a8-9256-565f4a7c689b	\N	Transferência enviada pelo Pix - Victor Augusto de Azevedo Ferreira - •••.827.896-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 42796253-6	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Victor Augusto de Azevedo Ferreira •••827896•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 427962536	\N
95	2025-10-30 19:22:33.571216	2025-12-26 14:03:27.637138	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	170.00	2025-10-10	debit	68e96a69-a2a8-4567-a322-823dbce98069	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
96	2025-10-30 19:22:33.571752	2025-12-26 14:03:27.637576	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	55.00	2025-10-10	debit	68e987da-3c86-4e24-88cf-4867126a6470	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
97	2025-10-30 19:22:33.572366	2025-12-26 14:03:27.638027	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	18.00	2025-10-10	debit	68e989ed-3f57-429c-bca5-bc4012f78699	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
98	2025-10-30 19:22:33.572957	2025-12-26 14:03:27.638514	1	\N	Transferência enviada pelo Pix MARIA ADELIA SANTOS •••924906•• STONE IP SA (0197) Agência: 1 Conta: 507204030	32.00	2025-10-10	debit	68e98adb-763d-4435-84b9-daa820997660	\N	Transferência enviada pelo Pix - MARIA ADELIA SANTOS - •••.924.906-•• - STONE IP S.A. (0197) Agência: 1 Conta: 50720403-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix MARIA ADELIA SANTOS •••924906•• STONE IP SA (0197) Agência: 1 Conta: 507204030	\N
99	2025-10-30 19:22:33.573539	2025-12-26 14:03:27.638985	1	\N	Transferência de saldo NuInvest	116.58	2025-10-14	credit	68ee433e-28eb-4bc0-86ec-65324718af9a	\N	Transferência de saldo NuInvest	\N	f	\N	\N	\N	f	Transferência de saldo NuInvest	\N
182	2025-10-30 19:22:41.781567	2025-11-08 16:55:46.53872	1	\N	AppleCom/Bill	204.90	2025-10-26	debit	68fc8942-8b8a-44fd-a1a0-fbec3c474097	\N	Apple.Com/Bill	\N	f	\N	\N	\N	f	AppleCom/Bill	\N
183	2025-10-30 19:22:41.782612	2025-11-08 16:55:46.539407	1	\N	Shopping Montes Claros	3.00	2025-10-26	debit	68fcd008-776a-4f48-8826-9e774db4ffc9	\N	Shopping Montes Claros	\N	f	\N	\N	\N	f	Shopping Montes Claros	\N
81	2025-10-30 19:22:33.560407	2025-12-26 14:03:27.629198	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	268.88	2025-10-02	debit	68deb19a-cce4-49ee-a926-5dfcb18a7503	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
103	2025-10-30 19:22:33.57705	2025-12-26 14:03:27.640986	1	\N	Pagamento de boleto efetuado KLISA COMUNICACAO & MULTMIDIA LTDA	109.90	2025-10-15	debit	68ef822e-e1ad-4675-98ed-6b25f444e5d8	\N	Pagamento de boleto efetuado - KLISA COMUNICACAO & MULTMIDIA LTDA	\N	f	\N	\N	\N	f	Pagamento de boleto efetuado KLISA COMUNICACAO & MULTMIDIA LTDA	\N
105	2025-10-30 19:22:33.578359	2025-12-26 14:03:27.642005	1	\N	Transferência enviada pelo Pix BRITO E BRITO BEM ESTAR MENTAL LTDA 28290759/000175 BANCO INTER (0077) Agência: 1 Conta: 331830477	700.00	2025-10-16	debit	68f14789-8afc-46f6-ba84-e0a08819c9f1	\N	Transferência enviada pelo Pix - BRITO E BRITO BEM ESTAR MENTAL LTDA - 28.290.759/0001-75 - BANCO INTER (0077) Agência: 1 Conta: 33183047-7	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix BRITO E BRITO BEM ESTAR MENTAL LTDA 28290759/000175 BANCO INTER (0077) Agência: 1 Conta: 331830477	\N
106	2025-10-30 19:22:33.578968	2025-12-26 14:03:27.642553	1	\N	Transferência Recebida SIRIUS EDICAO E SUPORTE TECNICO LTDA 29234819/000103 NU PAGAMENTOS IP (0260) Agência: 1 Conta: 924584522	39527.87	2025-10-16	credit	68f15bce-2ff3-4a32-9d2a-c029a88c6e43	\N	Transferência Recebida - SIRIUS EDICAO E SUPORTE TECNICO LTDA - 29.234.819/0001-03 - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 92458452-2	\N	f	\N	\N	\N	f	Transferência Recebida SIRIUS EDICAO E SUPORTE TECNICO LTDA 29234819/000103 NU PAGAMENTOS IP (0260) Agência: 1 Conta: 924584522	\N
107	2025-10-30 19:22:33.579569	2025-12-26 14:03:27.643027	1	\N	Transferência enviada pelo Pix Lucas Almeida Aguiar •••115146•• CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 10000000000321199	7500.00	2025-10-16	debit	68f15cee-b173-4814-a1ba-b779ac94afca	\N	Transferência enviada pelo Pix - Lucas Almeida Aguiar - •••.115.146-•• - CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 1000000000032119-9	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Lucas Almeida Aguiar •••115146•• CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 10000000000321199	\N
108	2025-10-30 19:22:33.580124	2025-12-26 14:03:27.643471	1	\N	Aplicação RDB	4000.00	2025-10-16	debit	68f15d86-9353-442b-824e-d9a7130c63ba	\N	Aplicação RDB	\N	f	\N	\N	\N	f	Aplicação RDB	\N
109	2025-10-30 19:22:33.580659	2025-12-26 14:03:27.64394	1	\N	Aplicação Fundo Nu Reserva Imediata Resp Ltda	400.00	2025-10-16	debit	68f15da0-591b-4568-8d66-cc942f3ae2cb	\N	Aplicação Fundo - Nu Reserva Imediata - Resp. Ltda	\N	f	\N	\N	\N	f	Aplicação Fundo Nu Reserva Imediata Resp Ltda	\N
110	2025-10-30 19:22:33.581199	2025-12-26 14:03:27.644412	1	\N	Compra de FII KNUQ11	1999.63	2025-10-16	debit	68f15de9-f813-45af-b819-e06e7116dc6e	\N	Compra de FII - KNUQ11	\N	f	\N	\N	\N	f	Compra de FII KNUQ11	\N
111	2025-10-30 19:22:33.581666	2025-12-26 14:03:27.64492	1	\N	Aplicação RDB	4000.00	2025-10-16	debit	68f15e10-7cee-43c8-b460-f783f4443da1	\N	Aplicação RDB	\N	f	\N	\N	\N	f	Aplicação RDB	\N
112	2025-10-30 19:22:33.582135	2025-12-26 14:03:27.645492	1	\N	Aplicação RDB	250.00	2025-10-16	debit	68f15e34-6b35-409b-9d2c-59a5696b1aae	\N	Aplicação RDB	\N	f	\N	\N	\N	f	Aplicação RDB	\N
113	2025-10-30 19:22:33.582611	2025-12-26 14:03:27.645943	1	\N	Aplicação RDB	700.00	2025-10-16	debit	68f15e4d-3fd7-42e5-8df4-280fcb1438da	\N	Aplicação RDB	\N	f	\N	\N	\N	f	Aplicação RDB	\N
114	2025-10-30 19:22:33.583077	2025-12-26 14:03:27.646563	1	\N	Aplicação RDB	350.00	2025-10-16	debit	68f15e6b-adf9-4efb-897a-2b48225c7525	\N	Aplicação RDB	\N	f	\N	\N	\N	f	Aplicação RDB	\N
115	2025-10-30 19:22:33.58366	2025-12-26 14:03:27.647078	1	\N	Aplicação RDB	100.00	2025-10-16	debit	68f15e86-5867-4a5e-8a78-266ff2e1cdfc	\N	Aplicação RDB	\N	f	\N	\N	\N	f	Aplicação RDB	\N
116	2025-10-30 19:22:33.58425	2025-12-26 14:03:27.647513	1	\N	Aplicação RDB	100.00	2025-10-16	debit	68f15e9b-43e4-4865-a059-9bb45308b061	\N	Aplicação RDB	\N	f	\N	\N	\N	f	Aplicação RDB	\N
117	2025-10-30 19:22:33.584826	2025-12-26 14:03:27.64792	1	\N	Aplicação RDB	50.00	2025-10-16	debit	68f15eb0-3790-4c0c-a051-ca222154e0df	\N	Aplicação RDB	\N	f	\N	\N	\N	f	Aplicação RDB	\N
118	2025-10-30 19:22:33.585424	2025-12-26 14:03:27.648362	1	\N	Pagamento de fatura	6885.79	2025-10-16	debit	68f19502-89fa-458d-bede-f1145dd4ab89	\N	Pagamento de fatura	\N	f	\N	\N	\N	f	Pagamento de fatura	\N
101	2025-10-30 19:22:33.575213	2025-12-26 14:03:27.639826	1	\N	Pagamento de boleto efetuado ALLIANZ SEGUROS SA	235.62	2025-10-15	debit	68ef81e9-c0d2-4723-8e77-181e8ef80a41	\N	Pagamento de boleto efetuado - ALLIANZ SEGUROS SA	\N	f	\N	\N	\N	f	Pagamento de boleto efetuado ALLIANZ SEGUROS SA	\N
120	2025-10-30 19:22:33.586591	2025-12-26 14:03:27.649358	1	\N	Compra de FII KNUQ11	16.34	2025-10-17	credit	68f23e24-ea05-4632-bd44-ef52e5020822	\N	Compra de FII - KNUQ11	\N	f	\N	\N	\N	f	Compra de FII KNUQ11	\N
121	2025-10-30 19:22:33.587394	2025-12-26 14:03:27.649895	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	197.90	2025-10-17	debit	68f23ec2-439c-47a1-af0c-9c56caa9e90a	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
122	2025-10-30 19:22:33.58792	2025-12-26 14:03:27.650441	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	80.00	2025-10-17	debit	68f25f55-233d-49af-85be-5d1b5cb8b0bb	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
123	2025-10-30 19:22:33.588496	2025-12-26 14:03:27.650888	1	\N	Transferência enviada pelo Pix Lívia Moreira de Almeida •••945696•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 760220356	10.00	2025-10-17	debit	68f294b3-ef46-4674-987b-53b89ef6c879	\N	Transferência enviada pelo Pix - Lívia Moreira de Almeida - •••.945.696-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 76022035-6	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Lívia Moreira de Almeida •••945696•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 760220356	\N
124	2025-10-30 19:22:33.589034	2025-12-26 14:03:27.651287	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	55.00	2025-10-17	debit	68f2a16b-a001-447a-b3e4-d97377c02ebd	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
125	2025-10-30 19:22:33.589535	2025-12-26 14:03:27.651715	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	421.66	2025-10-17	debit	68f2d8f1-b53d-4ad5-8de7-e8505a49ab9c	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
126	2025-10-30 19:22:33.590049	2025-12-26 14:03:27.65217	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	814.44	2025-10-17	debit	68f2d91f-7f95-4c0f-9eac-d480e08647e4	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
127	2025-10-30 19:22:33.590578	2025-12-26 14:03:27.652673	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	120.00	2025-10-18	debit	68f38f29-cf34-4bc3-95eb-5abfadf99759	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
184	2025-10-30 19:22:41.783592	2025-11-08 16:55:46.540025	1	\N	Amazon	245.68	2025-10-26	debit	68fac074-17d6-4d02-a200-2094b8bfb0cf	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
119	2025-10-30 19:22:33.585998	2025-12-26 14:03:27.648852	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	91.54	2025-10-17	debit	68f23105-c298-4bfa-8dc6-fc20ca4676ad	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
132	2025-10-30 19:22:33.592861	2025-12-26 14:03:27.655281	1	\N	Transferência enviada pelo Pix (saldo compartilhado) Instituto Educacional Myrmex Ltda Me CNPJ 50114307/000191 Conta 130023310	2428.90	2025-10-20	debit	68f64af0-2f95-4c20-9311-f89e9c688b7c	\N	Transferência enviada pelo Pix (saldo compartilhado) - Instituto Educacional Myrmex Ltda Me - CNPJ 50.114.307/0001-91 - Conta 13002331-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix (saldo compartilhado) Instituto Educacional Myrmex Ltda Me CNPJ 50114307/000191 Conta 130023310	\N
133	2025-10-30 19:22:33.593268	2025-12-26 14:03:27.6557	1	\N	Transferência de saldo NuInvest	0.02	2025-10-20	credit	68f6733f-000c-485e-a751-75979fe6eec6	\N	Transferência de saldo NuInvest	\N	f	\N	\N	\N	f	Transferência de saldo NuInvest	\N
134	2025-10-30 19:22:33.593683	2025-12-26 14:03:27.656134	1	\N	Transferência enviada pelo Pix (saldo compartilhado) DALMIR FERREIRA DA SILVA CPF •••384886•• Conta 945339410	226.00	2025-10-20	debit	68f6be89-5fe3-49df-aaba-b797bc36a2de	\N	Transferência enviada pelo Pix (saldo compartilhado) - DALMIR FERREIRA DA SILVA - CPF •••.384.886-•• - Conta 94533941-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix (saldo compartilhado) DALMIR FERREIRA DA SILVA CPF •••384886•• Conta 945339410	\N
135	2025-10-30 19:22:33.594116	2025-12-26 14:03:27.656624	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	1283.55	2025-10-21	debit	68f7ee4c-86c5-4677-96d1-7df7f51ab760	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
136	2025-10-30 19:22:33.594529	2025-12-26 14:03:27.657139	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	260.71	2025-10-22	debit	68f8caa3-786d-4373-8444-9837e3a0af61	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
137	2025-10-30 19:22:33.595179	2025-12-26 14:03:27.657588	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	170.00	2025-10-22	debit	68f93342-7ebe-494b-bd7d-40beaffa2825	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
138	2025-10-30 19:22:33.595516	2025-12-26 14:03:27.658051	1	\N	Transferência Recebida Breno Silva Santos de Souza •••090266•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 31181892	70.00	2025-10-23	credit	68fa4ff1-f07c-402f-858f-07293824274e	\N	Transferência Recebida - Breno Silva Santos de Souza - •••.090.266-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 3118189-2	\N	f	\N	\N	\N	f	Transferência Recebida Breno Silva Santos de Souza •••090266•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 31181892	\N
139	2025-10-30 19:22:33.595849	2025-12-26 14:03:27.658516	1	\N	Transferência Recebida Victor Felipe Arthur Coutinho Ladeia •••548356•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 70790678	66.00	2025-10-23	credit	68fa4ffd-5f1f-4d71-9379-276cae884d5b	\N	Transferência Recebida - Victor Felipe Arthur Coutinho Ladeia - •••.548.356-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 7079067-8	\N	f	\N	\N	\N	f	Transferência Recebida Victor Felipe Arthur Coutinho Ladeia •••548356•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 70790678	\N
140	2025-10-30 19:22:33.596181	2025-12-26 14:03:27.65897	1	\N	Transferência Recebida Gaspar Leite Pereira Neto •••402926•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 73885028	70.00	2025-10-23	credit	68fa5025-c3cb-4116-ba89-1b9d14ec9031	\N	Transferência Recebida - Gaspar Leite Pereira Neto - •••.402.926-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 7388502-8	\N	f	\N	\N	\N	f	Transferência Recebida Gaspar Leite Pereira Neto •••402926•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 73885028	\N
141	2025-10-30 19:22:33.596503	2025-12-26 14:03:27.659431	1	\N	Transferência recebida pelo Pix ERICO PORTO TORRES •••777466•• BCO SANTANDER (BRASIL) SA (0033) Agência: 3504 Conta: 10824098	77.00	2025-10-23	credit	68fa5083-c0f2-4f43-a2c0-701be91f7b6a	\N	Transferência recebida pelo Pix - ERICO PORTO TORRES - •••.777.466-•• - BCO SANTANDER (BRASIL) S.A. (0033) Agência: 3504 Conta: 1082409-8	\N	f	\N	\N	\N	f	Transferência recebida pelo Pix ERICO PORTO TORRES •••777466•• BCO SANTANDER (BRASIL) SA (0033) Agência: 3504 Conta: 10824098	\N
142	2025-10-30 19:22:33.596846	2025-12-26 14:03:27.659911	1	\N	Transferência Recebida Fellipe Geraldo Pereira Botelho •••815276•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 56640864	77.88	2025-10-23	credit	68fa51d7-bc1a-44ef-9437-9af79a0e199d	\N	Transferência Recebida - Fellipe Geraldo Pereira Botelho - •••.815.276-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 5664086-4	\N	f	\N	\N	\N	f	Transferência Recebida Fellipe Geraldo Pereira Botelho •••815276•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 56640864	\N
143	2025-10-30 19:22:33.597233	2025-12-26 14:03:27.66032	1	\N	Transferência enviada pelo Pix FERNANDO HENRIQUE LIMA MARTINS •••226146•• BCO BRADESCO SA (0237) Agência: 3049 Conta: 1160745	135.00	2025-10-23	debit	68fa9888-3170-4abb-8ef7-27d280d7c478	\N	Transferência enviada pelo Pix - FERNANDO HENRIQUE LIMA MARTINS - •••.226.146-•• - BCO BRADESCO S.A. (0237) Agência: 3049 Conta: 116074-5	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix FERNANDO HENRIQUE LIMA MARTINS •••226146•• BCO BRADESCO SA (0237) Agência: 3049 Conta: 1160745	\N
144	2025-10-30 19:22:33.59759	2025-12-26 14:03:27.660739	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	140.00	2025-10-24	debit	68fb8610-7e61-4bb3-b8d0-6460d519c156	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
145	2025-10-30 19:22:33.597918	2025-12-26 14:03:27.66121	1	\N	Transferência enviada pelo Pix Luciana Bezerra de Souza •••156738•• MERCADO PAGO IP LTDA (0323) Agência: 1 Conta: 53113168126	1.00	2025-10-24	debit	68fbd3c2-edf3-4517-8858-592b3d946f76	\N	Transferência enviada pelo Pix - Luciana Bezerra de Souza - •••.156.738-•• - MERCADO PAGO IP LTDA. (0323) Agência: 1 Conta: 5311316812-6	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Luciana Bezerra de Souza •••156738•• MERCADO PAGO IP LTDA (0323) Agência: 1 Conta: 53113168126	\N
146	2025-10-30 19:22:33.598274	2025-12-26 14:03:27.661753	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	172.53	2025-10-24	debit	68fbf338-5375-4a54-9eca-e2ae7d5334c4	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
180	2025-10-30 19:22:41.778814	2025-11-08 16:55:46.536678	1	\N	Drogaria Minas Brasil	58.87	2025-10-27	debit	68fe892f-da37-445a-934e-db7f261c792e	\N	Drogaria Minas Brasil	\N	f	\N	\N	\N	f	Drogaria Minas Brasil	\N
181	2025-10-30 19:22:41.779936	2025-11-08 16:55:46.537735	1	\N	Drogaria Minas Brasil	43.15	2025-10-27	debit	68fe895c-b10c-4e9f-b482-7c4460393ba5	\N	Drogaria Minas Brasil	\N	f	\N	\N	\N	f	Drogaria Minas Brasil	\N
147	2025-10-30 19:22:33.598672	2025-12-26 14:03:27.662366	1	\N	Transferência enviada pelo Pix (saldo compartilhado) Miraita Maciel de Almeida CPF •••893026•• Conta 318014667	300.00	2025-10-24	debit	68fbf4b4-2c41-4bd1-b259-a3b3be8c0413	\N	Transferência enviada pelo Pix (saldo compartilhado) - Miraita Maciel de Almeida - CPF •••.893.026-•• - Conta 31801466-7	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix (saldo compartilhado) Miraita Maciel de Almeida CPF •••893026•• Conta 318014667	\N
148	2025-10-30 19:22:33.59905	2025-12-26 14:03:27.662909	1	\N	Transferência enviada pelo Pix Miraita Maciel de Almeida •••893026•• CC CREDINOSSO Agência: 3327 Conta: 120480	100.00	2025-10-25	debit	68fce5b2-ce14-40eb-958f-78236430b14e	\N	Transferência enviada pelo Pix - Miraita Maciel de Almeida - •••.893.026-•• - CC CREDINOSSO Agência: 3327 Conta: 12048-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Miraita Maciel de Almeida •••893026•• CC CREDINOSSO Agência: 3327 Conta: 120480	\N
149	2025-10-30 19:22:33.599383	2025-12-26 14:03:27.663501	1	\N	Pagamento de fatura (saldo compartilhado)	1486.91	2025-10-25	debit	68fce5d4-0731-4c68-bbbd-5e4b2a8d6c6d	\N	Pagamento de fatura (saldo compartilhado)	\N	f	\N	\N	\N	f	Pagamento de fatura (saldo compartilhado)	\N
129	2025-10-30 19:22:33.591677	2025-12-26 14:03:27.653582	1	\N	Pagamento de fatura (saldo compartilhado)	1948.06	2025-10-19	debit	68f53c93-cfda-4663-b6c1-73bbca946eb0	\N	Pagamento de fatura (saldo compartilhado)	\N	f	\N	\N	\N	f	Pagamento de fatura (saldo compartilhado)	\N
170	2025-10-30 19:22:38.096431	2025-10-30 19:22:38.096431	1	\N	 - Mercadolivre*Alleshop	269.90	2025-10-29	debit	6900b98a-3bb2-4ddc-99b5-ccf8fd01644d	\N	Mercadolivre*Alleshop	\N	f	\N	\N	\N	f	 - Mercadolivre*Alleshop	\N
171	2025-10-30 19:22:38.097182	2025-10-30 19:22:38.097182	1	\N	 - Drogaria Minas Brasil	41.48	2025-10-28	debit	68ff6897-9641-4816-8a8f-6d9f8dbde81f	\N	Drogaria Minas Brasil	\N	f	\N	\N	\N	f	 - Drogaria Minas Brasil	\N
172	2025-10-30 19:22:38.0979	2025-10-30 19:22:38.0979	1	\N	 - 61.229.155 Marli Cost	18.00	2025-10-28	debit	68ff6bdf-7c4c-413e-9282-8fcff910935b	\N	61.229.155 Marli Cost	\N	f	\N	\N	\N	f	 - 61.229.155 Marli Cost	\N
174	2025-10-30 19:22:38.099284	2025-10-30 19:22:38.099284	1	\N	 - Casadecarnes	4.59	2025-10-28	debit	68ff6ab0-7a94-42ce-b52a-c23c2da94c0c	\N	Casadecarnes	\N	f	\N	\N	\N	f	 - Casadecarnes	\N
175	2025-10-30 19:22:38.100018	2025-10-30 19:22:38.100018	1	\N	 - Mercadofacil	5.20	2025-10-28	debit	68ffcfcc-4530-44e0-98e2-c63d0f1f35af	\N	Mercadofacil	\N	f	\N	\N	\N	f	 - Mercadofacil	\N
176	2025-10-30 19:22:38.100697	2025-10-30 19:22:38.100697	1	\N	 - Amazon	69.16	2025-10-28	debit	68ffb20c-af11-418d-a90c-7f11e048f9b0	\N	Amazon	\N	f	\N	\N	\N	f	 - Amazon	\N
177	2025-10-30 19:22:38.101379	2025-10-30 19:22:38.101379	1	\N	 - Mercadofacil	3.81	2025-10-28	debit	68ffd267-9cd8-4289-90a4-aa92e04b4776	\N	Mercadofacil	\N	f	\N	\N	\N	f	 - Mercadofacil	\N
169	2025-10-30 19:22:38.095098	2025-11-08 14:58:36.823831	1	39	Feira Supermercado	571.00	2025-10-29	debit	6900b5ae-9d69-48a4-a82a-2d260a1917c1	\N	Cordeiro Supermercados	\N	f	\N	\N	\N	f	Feira Supermercado	\N
152	2025-10-30 19:22:33.602332	2025-12-26 14:03:27.666094	1	\N	Transferência enviada pelo Pix Nelson Pereira da Silva •••491156•• CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 12880000008692569010	40.00	2025-10-27	debit	68ffe0cd-8ace-43e4-b3f2-b1e393ea6c2a	\N	Transferência enviada pelo Pix - Nelson Pereira da Silva - •••.491.156-•• - CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 1288000000869256901-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Nelson Pereira da Silva •••491156•• CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 12880000008692569010	\N
153	2025-10-30 19:22:33.602674	2025-12-26 14:03:27.66679	1	\N	Transferência enviada pelo Pix (saldo compartilhado) SONIA SOPHIA ALVES BATISTA CPF •••780836•• Conta 482100486	100.00	2025-10-28	debit	690096d8-892a-4fea-a512-d560336baccc	\N	Transferência enviada pelo Pix (saldo compartilhado) - SONIA SOPHIA ALVES BATISTA - CPF •••.780.836-•• - Conta 48210048-6	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix (saldo compartilhado) SONIA SOPHIA ALVES BATISTA CPF •••780836•• Conta 482100486	\N
154	2025-10-30 19:22:33.603021	2025-12-26 14:03:27.667487	1	\N	Transferência recebida pelo Pix LAYS ALMEIDA AGUIAR •••115136•• PAGSEGURO INTERNET IP SA (0290) Agência: 1 Conta: 759388499	269.00	2025-10-28	credit	6900bf10-77e7-4368-ab47-85c97b787c49	\N	Transferência recebida pelo Pix - LAYS ALMEIDA AGUIAR - •••.115.136-•• - PAGSEGURO INTERNET IP S.A. (0290) Agência: 1 Conta: 75938849-9	\N	f	\N	\N	\N	f	Transferência recebida pelo Pix LAYS ALMEIDA AGUIAR •••115136•• PAGSEGURO INTERNET IP SA (0290) Agência: 1 Conta: 759388499	\N
155	2025-10-30 19:22:33.603346	2025-12-26 14:03:27.66819	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	313.72	2025-10-28	debit	6900f372-b6b3-40d2-8376-3e73c8588ec2	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
156	2025-10-30 19:22:33.603716	2025-12-26 14:03:27.668694	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	445.00	2025-10-28	debit	6901031b-ac9a-4575-b0d3-c6c9451b5806	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
157	2025-10-30 19:22:33.604099	2025-11-08 16:57:46.534758	1	4	Plano de Saúde	1495.34	2025-10-29	debit	00dcb3c8-6973-4d0f-841f-6eb3c0e6a9c5	\N	Pagamento de boleto efetuado (saldo compartilhado) - UNIMED MONTES CLAROS COOPERATIVA TRABALHO MEDICO L	\N	f	\N	\N	\N	f	Plano de Saúde	\N
158	2025-10-30 19:22:33.604455	2025-11-08 16:58:04.689193	1	4	Plano de Saúde - Coparticipação	21.46	2025-10-29	debit	377aa82f-aad1-4da3-af46-786acd624359	\N	Pagamento de boleto efetuado (saldo compartilhado) - UNIMED MONTES CLAROS COOPERATIVA TRABALHO MEDICO L	\N	f	\N	\N	\N	f	Plano de Saúde - Coparticipação	\N
151	2025-10-30 19:22:33.60008	2025-12-26 14:03:27.66514	1	\N	Transferência enviada pelo Pix Pedro Paulo Vasconcelos •••857976•• CAIXA ECONOMICA FEDERAL (0104) Agência: 132 Conta: 12880000008571551780	35.00	2025-10-27	debit	68ffb0ce-a4b2-46f7-82e6-b5362a199d45	\N	Transferência enviada pelo Pix - Pedro Paulo Vasconcelos - •••.857.976-•• - CAIXA ECONOMICA FEDERAL (0104) Agência: 132 Conta: 1288000000857155178-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Pedro Paulo Vasconcelos •••857976•• CAIXA ECONOMICA FEDERAL (0104) Agência: 132 Conta: 12880000008571551780	\N
160	2025-10-30 19:22:33.605192	2025-11-08 16:55:41.857861	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	29.29	2025-10-29	credit	6902223e-2b5d-4d06-b122-ae384570b625:reversal	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
161	2025-10-30 19:22:33.60555	2025-11-08 16:55:41.858091	1	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	155.93	2025-10-29	debit	690276d4-614a-4b16-8f98-9085991a9eb0	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
178	2025-10-30 19:22:41.773269	2025-11-08 16:55:46.532745	1	\N	Padaria e Confeitaria	33.78	2025-10-27	debit	68fe7439-74c3-4661-96f6-10b4469ae329	\N	Padaria e Confeitaria	\N	f	\N	\N	\N	f	Padaria e Confeitaria	\N
173	2025-10-30 19:22:38.098582	2025-11-08 16:55:46.595422	1	\N	Studio Junia Guimaraes Parcela 2/8	611.75	2025-09-27	debit	68d3fbb0-4620-481d-b976-4fd6c2421d3f	\N	Studio Junia Guimaraes - Parcela 2/8	\N	f	\N	\N	\N	f	Studio Junia Guimaraes Parcela 2/8	\N
159	2025-10-30 19:22:33.60481	2025-11-08 18:50:15.116775	1	\N	Pagamento de fatura (saldo compartilhado)	866.14	2025-10-29	debit	69021d34-bd87-4982-bae2-eef375c2c3b8	\N	Pagamento de fatura (saldo compartilhado)	\N	f	\N	\N	\N	t	Pagamento de fatura (saldo compartilhado)	\N
167	2025-10-30 19:22:38.092328	2025-11-08 17:05:09.546331	1	39	Feira	121.75	2025-10-29	debit	6900fb65-9f19-4df5-a12a-c898c878e107	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Feira	\N
187	2025-10-30 19:22:41.787451	2025-11-08 16:55:46.542075	1	\N	Strutural Participaca	9.00	2025-10-26	debit	68fcd66b-3f65-4bca-86c3-a0d74cf109fa	\N	Strutural Participaca	\N	f	\N	\N	\N	f	Strutural Participaca	\N
188	2025-10-30 19:22:41.788484	2025-11-08 16:55:46.542659	1	\N	AppleCom/Bill	689.00	2025-10-26	debit	68fd19a6-da33-4d93-ab2a-3dc69808c790	\N	Apple.Com/Bill	\N	f	\N	\N	\N	f	AppleCom/Bill	\N
189	2025-10-30 19:22:41.791111	2025-11-08 16:55:46.5435	1	\N	Pagamento recebido	1486.91	2025-10-25	credit	68fce5d5-694d-4cc8-9a3a-f69961fd6cf2	\N	Pagamento recebido	\N	f	\N	\N	\N	f	Pagamento recebido	\N
190	2025-10-30 19:22:41.792063	2025-11-08 16:55:46.544383	1	\N	Amazonmktplc*Mundodasf	29.99	2025-10-25	debit	68faa71a-5909-4ff2-8e40-5b082dba4f95	\N	Amazonmktplc*Mundodasf	\N	f	\N	\N	\N	f	Amazonmktplc*Mundodasf	\N
191	2025-10-30 19:22:41.793187	2025-11-08 16:55:46.545336	1	\N	Villefort Atacadista	273.25	2025-10-25	debit	68fb9679-731e-4eba-8cad-897327f95846	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
192	2025-10-30 19:22:41.793989	2025-11-08 16:55:46.546215	1	\N	Mercadofacil	14.00	2025-10-25	debit	68fb6907-e399-4d70-823e-44def496e25d	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
193	2025-10-30 19:22:41.794836	2025-11-08 16:55:46.547329	1	\N	Mercadofacil	9.26	2025-10-24	debit	68fa1ba4-471b-4b31-a0cf-b69478302834	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
194	2025-10-30 19:22:41.795599	2025-11-08 16:55:46.548342	1	\N	Eduardo Fernandes Ribe	51.00	2025-10-24	debit	68fa2c0c-33a9-4198-8fc3-ff56bee9582a	\N	Eduardo Fernandes Ribe	\N	f	\N	\N	\N	f	Eduardo Fernandes Ribe	\N
195	2025-10-30 19:22:41.796737	2025-11-08 16:55:46.549339	1	\N	Uber* Trip	14.09	2025-10-23	debit	68fa0c8f-a3a4-4f7b-a414-2722d7fa73b3	\N	Uber* Trip	\N	f	\N	\N	\N	f	Uber* Trip	\N
196	2025-10-30 19:22:41.797707	2025-11-08 16:55:46.550324	1	\N	Casadecarnes	19.90	2025-10-23	debit	68f92ea4-f8d1-4661-b74f-332828a4035d	\N	Casadecarnes	\N	f	\N	\N	\N	f	Casadecarnes	\N
197	2025-10-30 19:22:41.798477	2025-11-08 16:55:46.551009	1	\N	Vila 61 Casa Bar	77.96	2025-10-23	debit	68f99600-da3a-496d-8dd2-0e05345d0e27	\N	Vila 61 Casa Bar	\N	f	\N	\N	\N	f	Vila 61 Casa Bar	\N
198	2025-10-30 19:22:41.799218	2025-11-08 16:55:46.551668	1	\N	Natelson Souza Junior	15.30	2025-10-23	debit	68f92d6b-f974-4e7a-a438-2bb719da0448	\N	Natelson Souza Junior	\N	f	\N	\N	\N	f	Natelson Souza Junior	\N
199	2025-10-30 19:22:41.799956	2025-11-08 16:55:46.55236	1	\N	Havan Montes Claros	59.99	2025-10-22	debit	68f80345-1c67-485f-99cf-98a7a9a92536	\N	Havan Montes Claros	\N	f	\N	\N	\N	f	Havan Montes Claros	\N
200	2025-10-30 19:22:41.800609	2025-11-08 16:55:46.553041	1	\N	Villefort Atacadista	426.86	2025-10-21	debit	68f6791a-f08d-402d-8556-7f90857c581e	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
201	2025-10-30 19:22:41.801225	2025-11-08 16:55:46.553699	1	\N	Centauro Ce181	49.99	2025-10-20	debit	68f5151e-73c9-488a-ab0d-751217e97daa	\N	Centauro Ce181	\N	f	\N	\N	\N	f	Centauro Ce181	\N
202	2025-10-30 19:22:41.801822	2025-11-08 16:55:46.554317	1	\N	Bsb Empreendimentos e	10.00	2025-10-20	debit	68f51a9a-e4c2-4dbe-bf44-e5f933a15411	\N	Bsb Empreendimentos e	\N	f	\N	\N	\N	f	Bsb Empreendimentos e	\N
203	2025-10-30 19:22:41.802464	2025-11-08 16:55:46.554878	1	\N	Starlink Internet	270.00	2025-10-20	debit	68f4e3db-ee4e-43b5-afca-2af75ec8823b	\N	Starlink Internet	\N	f	\N	\N	\N	f	Starlink Internet	\N
204	2025-10-30 19:22:41.803047	2025-11-08 16:55:46.555409	1	\N	Octoo Bar	202.69	2025-10-20	debit	68f50e78-a1a4-45c9-877c-20aa115a1229	\N	Octoo Bar	\N	f	\N	\N	\N	f	Octoo Bar	\N
205	2025-10-30 19:22:41.803608	2025-11-08 16:55:46.55596	1	\N	Club Melissa	149.90	2025-10-20	debit	68f519f7-3f98-44d2-ba06-969cc75c0c58	\N	Club Melissa	\N	f	\N	\N	\N	f	Club Melissa	\N
206	2025-10-30 19:22:41.804189	2025-11-08 16:55:46.55657	1	\N	Center Pao	69.71	2025-10-20	debit	68f52f9f-1459-4948-b316-27fbd261734d	\N	Center Pao	\N	f	\N	\N	\N	f	Center Pao	\N
207	2025-10-30 19:22:41.804841	2025-11-08 16:55:46.557111	1	\N	Shopping Montes Claros	14.00	2025-10-20	debit	68f51123-bfcf-4f5d-8428-ba71a0e96873	\N	Shopping Montes Claros	\N	f	\N	\N	\N	f	Shopping Montes Claros	\N
208	2025-10-30 19:22:41.805403	2025-11-08 16:55:46.557664	1	\N	Pagamento recebido	1948.06	2025-10-19	credit	68f53c94-4827-4c86-88ab-01801e34b850	\N	Pagamento recebido	\N	f	\N	\N	\N	f	Pagamento recebido	\N
209	2025-10-30 19:22:41.806265	2025-11-08 16:55:46.558231	1	\N	Amazon	43.98	2025-10-18	debit	68f21034-bfd8-4a07-a94b-18609003ff4d	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
210	2025-10-30 19:22:41.806841	2025-11-08 16:55:46.558757	1	\N	Amazon	1079.43	2025-10-18	debit	68f15c35-2750-4f24-b191-6e6bada3177d	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
211	2025-10-30 19:22:41.807487	2025-11-08 16:55:46.559265	1	\N	Mercado*Vamosnessacom	625.49	2025-10-18	debit	68f257ea-faf4-42de-883d-5f858c56113c	\N	Mercado*Vamosnessacom	\N	f	\N	\N	\N	f	Mercado*Vamosnessacom	\N
214	2025-10-30 19:22:41.809524	2025-11-08 16:55:46.560756	1	\N	Mercadolivre*Mercadol	40.99	2025-10-17	debit	68f0191d-645b-4480-bb1a-d349016a49bd	\N	Mercadolivre*Mercadol	\N	f	\N	\N	\N	f	Mercadolivre*Mercadol	\N
212	2025-10-30 19:22:41.808229	2025-11-08 16:55:46.560239	1	\N	Estorno de Mercadolivre*Mssoldas	54.70	2025-10-18	credit	68f230a4-78cd-4da2-87db-39c688acd1e9	\N	Estorno de "Mercadolivre*Mssoldas"	\N	f	\N	\N	\N	f	Estorno de Mercadolivre*Mssoldas	\N
215	2025-10-30 19:22:41.810329	2025-11-08 16:55:46.561289	1	\N	Uber Uber *Trip HelpU	25.90	2025-10-17	debit	68f14ba3-50aa-42f1-9f59-c88680f375c8	\N	Uber Uber *Trip Help.U	\N	f	\N	\N	\N	f	Uber Uber *Trip HelpU	\N
216	2025-10-30 19:22:41.811972	2025-11-08 16:55:46.561752	1	\N	Cozy Resto Culinaria C	457.60	2025-10-17	debit	68f19ae5-4a58-4799-8203-2c22c03ca221	\N	Cozy Resto Culinaria C	\N	f	\N	\N	\N	f	Cozy Resto Culinaria C	\N
217	2025-10-30 19:22:41.8128	2025-11-08 16:55:46.562546	1	\N	Casadecarnes	103.75	2025-10-17	debit	68f1533e-b578-4aff-b45c-993bb422176b	\N	Casadecarnes	\N	f	\N	\N	\N	f	Casadecarnes	\N
218	2025-10-30 19:22:41.813574	2025-11-08 16:55:46.56346	1	\N	Mercadolivre*Betastyl	172.78	2025-10-17	debit	68f123c4-3e71-4307-bcfb-2caedf23e2a8	\N	Mercadolivre*Betastyl	\N	f	\N	\N	\N	f	Mercadolivre*Betastyl	\N
219	2025-10-30 19:22:41.814367	2025-11-08 16:55:46.564127	1	\N	Uber* Trip	10.00	2025-10-17	debit	68f153b1-d8dc-4857-9d5c-220c5d692297	\N	Uber* Trip	\N	f	\N	\N	\N	f	Uber* Trip	\N
220	2025-10-30 19:22:41.815127	2025-11-08 16:55:46.564735	1	\N	Casadecarnes	23.00	2025-10-17	debit	68f15397-58ec-47c1-a4a4-6807b8db6bda	\N	Casadecarnes	\N	f	\N	\N	\N	f	Casadecarnes	\N
221	2025-10-30 19:22:41.815865	2025-11-08 16:55:46.565308	1	\N	Uber Uber *Trip HelpU	20.57	2025-10-17	debit	68f13743-2251-427a-914d-96532570647c	\N	Uber Uber *Trip Help.U	\N	f	\N	\N	\N	f	Uber Uber *Trip HelpU	\N
222	2025-10-30 19:22:41.816552	2025-11-08 16:55:46.565862	1	\N	Drogaria Minas Brasi	249.28	2025-10-17	debit	68f14b50-dfec-4513-83f6-8b5a51900317	\N	Drogaria Minas Brasi	\N	f	\N	\N	\N	f	Drogaria Minas Brasi	\N
224	2025-10-30 19:22:41.817429	2025-11-08 16:55:46.567281	1	\N	Posto Esplanada	194.25	2025-10-16	debit	68f01cd2-9c15-41ee-8cb2-32a543d92f68	\N	Posto Esplanada	\N	f	\N	\N	\N	f	Posto Esplanada	\N
225	2025-10-30 19:22:41.818022	2025-11-08 16:55:46.567793	1	\N	Mercadolivre*Aumax	30.69	2025-10-16	debit	68ef8353-4300-44b6-9f98-260f20bc4c21	\N	Mercadolivre*Aumax	\N	f	\N	\N	\N	f	Mercadolivre*Aumax	\N
226	2025-10-30 19:22:41.818627	2025-11-08 16:55:46.568291	1	\N	Eduardo Fernandes Ribe	152.00	2025-10-16	debit	68efbda6-2228-4709-be65-addeb6ca7b47	\N	Eduardo Fernandes Ribe	\N	f	\N	\N	\N	f	Eduardo Fernandes Ribe	\N
227	2025-10-30 19:22:41.819296	2025-11-08 16:55:46.568777	1	\N	Cordeiro Supermercados	418.30	2025-10-15	debit	68ee6468-4c16-4d38-ac42-611d2567c920	\N	Cordeiro Supermercados	\N	f	\N	\N	\N	f	Cordeiro Supermercados	\N
228	2025-10-30 19:22:41.819893	2025-11-08 16:55:46.56932	1	\N	Drogaria Minas Brasil	28.40	2025-10-15	debit	68ee5442-18b9-4c6e-b3c9-88abe394f268	\N	Drogaria Minas Brasil	\N	f	\N	\N	\N	f	Drogaria Minas Brasil	\N
232	2025-10-30 19:22:41.822541	2025-11-08 16:55:46.571104	1	\N	Nortepec	400.00	2025-10-14	debit	68ecdf26-dada-451b-a3e0-378c259c2038	\N	Nortepec	\N	f	\N	\N	\N	f	Nortepec	\N
230	2025-10-30 19:22:41.821396	2025-11-08 16:55:46.570291	1	\N	Mercadofacil	5.41	2025-10-14	debit	68ecf7ee-dca3-4661-b30a-1cd724c5d80d	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
234	2025-10-30 19:22:41.823341	2025-11-08 16:55:46.571877	1	\N	Padaria e Confeitaria	24.48	2025-10-13	debit	68ec0376-33da-47fe-9780-b44e9ac86140	\N	Padaria e Confeitaria	\N	f	\N	\N	\N	f	Padaria e Confeitaria	\N
229	2025-10-30 19:22:41.820744	2025-11-08 16:55:46.571475	1	\N	Discord* Nitromonthly	26.07	2025-10-14	debit	68ed22f8-ec66-4e93-9aa8-ab49821ce9ad	\N	Discord* Nitromonthly	\N	f	\N	\N	\N	f	Discord* Nitromonthly	\N
235	2025-10-30 19:22:41.823831	2025-11-08 16:55:46.572615	1	\N	Arautos do Evangelho	13.00	2025-10-13	debit	68ebc353-0178-4ef4-b25b-5b2120ee5fb6	\N	Arautos do Evangelho	\N	f	\N	\N	\N	f	Arautos do Evangelho	\N
236	2025-10-30 19:22:41.824282	2025-11-08 16:55:46.572999	1	\N	Erasmo Pampulha Tennis	3.00	2025-10-12	debit	68eac0e9-2d35-47f1-82ec-a4531ea7bf6d	\N	Erasmo Pampulha Tennis	\N	f	\N	\N	\N	f	Erasmo Pampulha Tennis	\N
237	2025-10-30 19:22:41.824739	2025-11-08 16:55:46.573345	1	\N	Villefort Atacadista	121.44	2025-10-12	debit	68ea6561-d01c-4689-a31f-83fe81ab0afa	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
240	2025-10-30 19:22:41.826155	2025-11-08 16:55:46.575403	1	\N	Uai Tche	5.00	2025-10-11	debit	68e95a42-7b1f-404f-9330-af886f092fae	\N	Uai Tche	\N	f	\N	\N	\N	f	Uai Tche	\N
241	2025-10-30 19:22:41.826536	2025-11-08 16:55:46.575773	1	\N	Delicias da Lu	13.00	2025-10-11	debit	68e98a5c-d1a6-4cdc-a0e6-2f339169f610	\N	Delicias da Lu	\N	f	\N	\N	\N	f	Delicias da Lu	\N
242	2025-10-30 19:22:41.826969	2025-11-08 16:55:46.57625	1	\N	Amazonmktplc*Clubedele	114.90	2025-10-11	debit	68e3b2ee-bd79-429f-bd0e-605121da5c03	\N	Amazonmktplc*Clubedele	\N	f	\N	\N	\N	f	Amazonmktplc*Clubedele	\N
243	2025-10-30 19:22:41.827332	2025-11-08 16:55:46.576719	1	\N	Mp *Espetinhosjap	26.00	2025-10-11	debit	68e988db-083d-4eec-8dbd-78deb658c9f1	\N	Mp *Espetinhosjap	\N	f	\N	\N	\N	f	Mp *Espetinhosjap	\N
244	2025-10-30 19:22:41.827722	2025-11-08 16:55:46.577198	1	\N	Amazon	59.94	2025-10-11	debit	68e89dfd-e5ed-4194-9346-01d76d471dba	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
245	2025-10-30 19:22:41.828205	2025-11-08 16:55:46.577805	1	\N	T e G Loja	79.00	2025-10-10	debit	68e7df4b-4cd8-4dbc-a4a6-1ae11382c9a5	\N	T e G Loja	\N	f	\N	\N	\N	f	T e G Loja	\N
246	2025-10-30 19:22:41.828913	2025-11-08 16:55:46.578159	1	\N	B91*Green Cell Moc	100.00	2025-10-10	debit	68e7982f-1347-4ed6-b73c-ec7025029bbd	\N	B91*Green Cell Moc	\N	f	\N	\N	\N	f	B91*Green Cell Moc	\N
247	2025-10-30 19:22:41.829304	2025-11-08 16:55:46.578481	1	\N	AppleCom/Bill	59.90	2025-10-10	debit	68e8257e-e81c-4d87-9b78-a8b4acd84051	\N	Apple.Com/Bill	\N	f	\N	\N	\N	f	AppleCom/Bill	\N
248	2025-10-30 19:22:41.829658	2025-11-08 16:55:46.578815	1	\N	Cacau Show	151.39	2025-10-10	debit	68e7d9ad-89e0-4429-bdb5-05bd4052f884	\N	Cacau Show	\N	f	\N	\N	\N	f	Cacau Show	\N
249	2025-10-30 19:22:41.829977	2025-11-08 16:55:46.579159	1	\N	Cordeiro Supermercados	320.32	2025-10-10	debit	68e79da0-c866-4f17-a518-8c1f352f9e4e	\N	Cordeiro Supermercados	\N	f	\N	\N	\N	f	Cordeiro Supermercados	\N
250	2025-10-30 19:22:41.830291	2025-11-08 16:55:46.57951	1	\N	AppleCom/Bill	19.90	2025-10-10	debit	68e73887-bc75-486c-a6c7-d2d735a22cf5	\N	Apple.Com/Bill	\N	f	\N	\N	\N	f	AppleCom/Bill	\N
253	2025-10-30 19:22:41.83117	2025-11-08 16:55:46.580579	1	\N	Amazon	15.71	2025-10-09	debit	68e58ea8-a77d-4a7e-b1a3-3db3f6b0f8b5	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
258	2025-10-30 19:22:41.832719	2025-11-08 16:55:46.582492	1	\N	Amazonmktplc*Afccomerc	134.90	2025-10-08	debit	68e48ad4-b05c-4dc2-a36b-a85f2ff93740	\N	Amazonmktplc*Afccomerc	\N	f	\N	\N	\N	f	Amazonmktplc*Afccomerc	\N
254	2025-10-30 19:22:41.831475	2025-11-08 16:55:46.580945	1	\N	Casadecarnes	132.90	2025-10-09	debit	68e6ba09-9fef-4576-9b92-db11dc97e1ef	\N	Casadecarnes	\N	f	\N	\N	\N	f	Casadecarnes	\N
255	2025-10-30 19:22:41.83179	2025-11-08 16:55:46.5813	1	\N	Arautos D0004809450	260.00	2025-10-09	debit	68e6fd5b-2519-47a4-9f36-591e41806d77	\N	Arautos D0004809450	\N	f	\N	\N	\N	f	Arautos D0004809450	\N
256	2025-10-30 19:22:41.832161	2025-11-08 16:55:46.581656	1	\N	Natelson Souza Junior	7.46	2025-10-09	debit	68e6b796-3fe8-4d52-bda8-9a0f5dcef804	\N	Natelson Souza Junior	\N	f	\N	\N	\N	f	Natelson Souza Junior	\N
251	2025-10-30 19:22:41.830657	2025-11-08 16:55:46.582129	1	\N	IOF de Cursor, Ai Powered Ide	3.87	2025-10-09	debit	68e6784b-fcf7-4058-a391-70ac0fc88c93	\N	IOF de "Cursor, Ai Powered Ide"	\N	f	\N	\N	\N	f	IOF de Cursor, Ai Powered Ide	\N
259	2025-10-30 19:22:41.833067	2025-11-08 16:55:46.582861	1	\N	Center Pao Supermercad	95.59	2025-10-08	debit	68e4eff5-86aa-4970-a5e0-991a56c95d28	\N	Center Pao Supermercad	\N	f	\N	\N	\N	f	Center Pao Supermercad	\N
260	2025-10-30 19:22:41.833405	2025-11-08 16:55:46.583222	1	\N	Salao Tio Ronaldo Kid	80.00	2025-10-08	debit	68e561e6-d2c8-4666-b32a-9e5dc0994f52	\N	Salao Tio Ronaldo Kid	\N	f	\N	\N	\N	f	Salao Tio Ronaldo Kid	\N
261	2025-10-30 19:22:41.833737	2025-11-08 16:55:46.583552	1	\N	Avellinos	207.50	2025-10-08	debit	68e5a40e-50a1-4932-8c5e-905f33a4a5f6	\N	Avellinos	\N	f	\N	\N	\N	f	Avellinos	\N
262	2025-10-30 19:22:41.83407	2025-11-08 16:55:46.583908	1	\N	Amazon	109.49	2025-10-08	debit	68e417ac-bb8c-47b6-8688-f7940c9953ab	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
263	2025-10-30 19:22:41.834406	2025-11-08 16:55:46.584265	1	\N	Villefort Atacadista	288.50	2025-10-08	debit	68e52944-aef5-41ca-b90f-091b846bb475	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
264	2025-10-30 19:22:41.834746	2025-11-08 16:55:46.584609	1	\N	Amazon	95.86	2025-10-08	debit	68e3cefe-ff44-4f00-984a-eb9d6a2706b4	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
265	2025-10-30 19:22:41.835078	2025-11-08 16:55:46.58497	1	\N	Amazon	79.90	2025-10-07	debit	68e3b6f4-7656-482f-abd3-ddd7f4e752f7	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
267	2025-10-30 19:22:41.835733	2025-11-08 16:55:46.585672	1	\N	Uber* Trip	17.91	2025-10-07	debit	68e43357-edad-4c88-9af6-0526011bb28d	\N	Uber* Trip	\N	f	\N	\N	\N	f	Uber* Trip	\N
268	2025-10-30 19:22:41.836421	2025-11-08 16:55:46.586021	1	\N	Cacau Show	58.17	2025-10-07	debit	68e41e25-922b-4ac9-a39d-28319aa0ce2f	\N	Cacau Show	\N	f	\N	\N	\N	f	Cacau Show	\N
269	2025-10-30 19:22:41.83675	2025-11-08 16:55:46.586345	1	\N	Center Pao Supermercad	152.84	2025-10-07	debit	68e41b41-02d2-4571-a403-063fa6613659	\N	Center Pao Supermercad	\N	f	\N	\N	\N	f	Center Pao Supermercad	\N
270	2025-10-30 19:22:41.837078	2025-11-08 16:55:46.58666	1	\N	Hna*Oboticario	290.00	2025-10-07	debit	68e42547-1bc0-40a8-9ca5-f7555d558db1	\N	Hna*Oboticario	\N	f	\N	\N	\N	f	Hna*Oboticario	\N
271	2025-10-30 19:22:41.837394	2025-11-08 16:55:46.586994	1	\N	Natelson Souza Junior	38.10	2025-10-05	debit	68e13204-2fa1-40b9-8ee7-e887a238e540	\N	Natelson Souza Junior	\N	f	\N	\N	\N	f	Natelson Souza Junior	\N
272	2025-10-30 19:22:41.837738	2025-11-08 16:55:46.587296	1	\N	EBW*Spotify Pre NuPay	40.90	2025-10-04	debit	68e0feb9-e2ca-4f63-ae20-54cf9c5d3ad6	\N	EBW*Spotify Pre - NuPay	\N	f	\N	\N	\N	f	EBW*Spotify Pre NuPay	\N
273	2025-10-30 19:22:41.838086	2025-11-08 16:55:46.587593	1	\N	Google One	9.99	2025-10-03	debit	68dd4f41-30b0-4919-8cc8-0c3874c7049a	\N	Google One	\N	f	\N	\N	\N	f	Google One	\N
274	2025-10-30 19:22:41.838408	2025-11-08 16:55:46.588119	1	\N	Villefort Atacadista	431.12	2025-10-03	debit	68deabe4-42ca-4bd6-9107-49f95e3c56e2	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
275	2025-10-30 19:22:41.838841	2025-11-08 16:55:46.588489	1	\N	Mercadofacil	13.77	2025-10-02	debit	68dd1793-b0da-436c-a652-db723fec10db	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
276	2025-10-30 19:22:41.839197	2025-11-08 16:55:46.588818	1	\N	Uber* Trip	18.24	2025-10-02	debit	68dd6da6-de44-4950-a53b-b6c535407aef	\N	Uber* Trip	\N	f	\N	\N	\N	f	Uber* Trip	\N
277	2025-10-30 19:22:41.839524	2025-11-08 16:55:46.589135	1	\N	Natelson Souza Junior	10.89	2025-10-02	debit	68dd7dcb-2f8e-4c24-8ff0-e9441d3ce3f6	\N	Natelson Souza Junior	\N	f	\N	\N	\N	f	Natelson Souza Junior	\N
278	2025-10-30 19:22:41.839866	2025-11-08 16:55:46.589475	1	\N	Amazon	53.99	2025-10-02	debit	68dc79a3-45a6-410f-a50b-4a51d9944b36	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
279	2025-10-30 19:22:41.840197	2025-11-08 16:55:46.58982	1	\N	Casadecarnes	52.33	2025-10-02	debit	68dd7f83-77bf-4d3c-aaac-e16c8d544402	\N	Casadecarnes	\N	f	\N	\N	\N	f	Casadecarnes	\N
280	2025-10-30 19:22:41.840521	2025-11-08 16:55:46.590199	1	\N	Amazon	299.00	2025-10-01	debit	68dc047c-1d5c-4241-99e3-1bd9d8df1fcb	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
281	2025-10-30 19:22:41.840849	2025-11-08 16:55:46.590547	1	\N	Amazonmktplc*Drogariab	46.90	2025-09-30	debit	68d81978-3231-48be-82b3-45c5549ebf74	\N	Amazonmktplc*Drogariab	\N	f	\N	\N	\N	f	Amazonmktplc*Drogariab	\N
282	2025-10-30 19:22:41.841169	2025-11-08 16:55:46.590927	1	\N	Amazonmktplc*Jackeline	15.90	2025-09-29	debit	68d84d16-3be1-4d72-8b76-6a3007f5d4ac	\N	Amazonmktplc*Jackeline	\N	f	\N	\N	\N	f	Amazonmktplc*Jackeline	\N
283	2025-10-30 19:22:41.841494	2025-11-08 16:55:46.591257	1	\N	Sinval Tolentino Cama	32.07	2025-09-29	debit	68d93763-201d-4097-9397-59b0d15e10de	\N	Sinval Tolentino Cama	\N	f	\N	\N	\N	f	Sinval Tolentino Cama	\N
284	2025-10-30 19:22:41.841775	2025-11-08 16:55:46.59158	1	\N	Amazonprimebr	19.90	2025-09-29	debit	68d88c43-8ccb-4179-98c7-9dc9b04f4efd	\N	Amazonprimebr	\N	f	\N	\N	\N	f	Amazonprimebr	\N
285	2025-10-30 19:22:41.842121	2025-11-08 16:55:46.591919	1	\N	Fruta Norte	240.87	2025-09-29	debit	68d93679-9405-433d-815a-6ec8d33aef0a	\N	Fruta Norte	\N	f	\N	\N	\N	f	Fruta Norte	\N
286	2025-10-30 19:22:41.842462	2025-11-08 16:55:46.592245	1	\N	Amazonmktplc*Istosimco	18.87	2025-09-29	debit	68d829cf-c774-4389-805f-c1f9cbd4bd86	\N	Amazonmktplc*Istosimco	\N	f	\N	\N	\N	f	Amazonmktplc*Istosimco	\N
287	2025-10-30 19:22:41.842803	2025-11-08 16:55:46.592552	1	\N	Amazon Marketplace	146.48	2025-09-29	debit	68d829d4-9af4-412c-8711-ca4cfe9d0357	\N	Amazon Marketplace	\N	f	\N	\N	\N	f	Amazon Marketplace	\N
288	2025-10-30 19:22:41.844482	2025-11-08 16:55:46.592907	1	\N	Amazon Digital	32.42	2025-09-29	debit	68d8918e-b059-4413-aa25-a61a75e47902	\N	Amazon Digital	\N	f	\N	\N	\N	f	Amazon Digital	\N
289	2025-10-30 19:22:41.844795	2025-11-08 16:55:46.593246	1	\N	Casadecarnes	91.81	2025-09-29	debit	68d9550d-a11a-4845-a167-80c0b4bfd492	\N	Casadecarnes	\N	f	\N	\N	\N	f	Casadecarnes	\N
290	2025-10-30 19:22:41.845159	2025-11-08 16:55:46.593596	1	\N	Villefort Atacadista	154.83	2025-09-29	debit	68d9324b-f6d6-460e-8b98-963f5514a9da	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
301	2025-10-31 12:47:58.246902	2025-10-31 12:47:58.246902	2	2	Gas station	150.00	2025-10-18	debit	\N	\N	\N	\N	f	\N	\N	\N	f	Gas station	\N
302	2025-10-31 12:47:58.246902	2025-10-31 12:47:58.246902	2	2	Uber ride	80.00	2025-10-25	debit	\N	\N	\N	\N	f	\N	\N	\N	f	Uber ride	\N
185	2025-10-30 19:22:41.785011	2025-11-08 16:55:46.540509	1	\N	Estorno de AppleCom/Bill	3.66	2025-10-26	credit	68d55dff-ec72-4c5b-b342-e30832f7b32c	\N	Estorno de "Apple.Com/Bill"	\N	f	\N	\N	\N	f	Estorno de AppleCom/Bill	\N
238	2025-10-30 19:22:41.825217	2025-11-08 16:55:46.573714	1	\N	Drogaria Minas Brasil	148.12	2025-10-11	debit	68e93243-8900-42e9-83fb-162e85b6d5d0	\N	Drogaria Minas Brasil	\N	f	\N	\N	\N	f	Drogaria Minas Brasil	\N
266	2025-10-30 19:22:41.835392	2025-11-08 16:55:46.58532	1	\N	Amazonmktplc*Starhouse	80.90	2025-10-07	debit	68e3b22f-4599-45e4-bafa-cc882a1c8d67	\N	Amazonmktplc*Starhouse	\N	f	\N	\N	\N	f	Amazonmktplc*Starhouse	\N
291	2025-10-30 19:22:41.845444	2025-11-08 16:55:46.594179	1	\N	Eduardo Fernandes Ribe	51.00	2025-09-29	debit	68d93b58-6ee3-4193-96a4-5e21c85962b8	\N	Eduardo Fernandes Ribe	\N	f	\N	\N	\N	f	Eduardo Fernandes Ribe	\N
292	2025-10-30 19:22:41.84577	2025-11-08 16:55:46.59449	1	\N	Arautos do Evangelho	120.00	2025-09-28	debit	68d84aa6-7b19-4a39-9e3b-8fb0d6d860e2	\N	Arautos do Evangelho	\N	f	\N	\N	\N	f	Arautos do Evangelho	\N
293	2025-10-30 19:22:41.846098	2025-11-08 16:55:46.594814	1	\N	Pagamento recebido	2287.19	2025-09-28	credit	68d9971a-1270-4da7-9f29-31fb13dd8e5e	\N	Pagamento recebido	\N	f	\N	\N	\N	f	Pagamento recebido	\N
294	2025-10-30 19:22:41.846434	2025-11-08 16:55:46.595115	1	\N	58672998bernardo	79.42	2025-09-28	debit	68d80625-b0eb-4a3e-8815-87ede3ae666e	\N	58672998bernardo	\N	f	\N	\N	\N	f	58672998bernardo	\N
296	2025-10-30 19:22:41.846931	2025-11-08 16:55:46.595738	1	\N	Plano NuCel 20GB	45.00	2025-09-27	debit	68d830e5-ee58-4e42-b7ac-0934e06c2fa9	\N	Plano NuCel 20GB	\N	f	\N	\N	\N	f	Plano NuCel 20GB	\N
297	2025-10-30 19:22:41.847207	2025-11-08 16:55:46.596043	1	\N	Lopes Teixeira Comerci	49.99	2025-09-27	debit	68d69c15-2972-45a6-b6a2-2ab7ff76b94b	\N	Lopes Teixeira Comerci	\N	f	\N	\N	\N	f	Lopes Teixeira Comerci	\N
298	2025-10-30 19:22:41.847498	2025-11-08 16:55:46.596344	1	\N	Marron Glace	79.75	2025-09-27	debit	68d6585a-2191-4e9a-b110-0595e292c4d3	\N	Marron Glace	\N	f	\N	\N	\N	f	Marron Glace	\N
165	2025-10-30 19:22:38.089933	2025-11-08 16:57:22.409625	1	34	Almoço	83.88	2025-10-30	debit	690387a6-3b27-4078-ac6d-e8030caee7d5	\N	Cia do Churrasco	\N	f	\N	\N	\N	f	Almoço	\N
79	2025-10-30 19:22:33.550474	2025-12-26 14:03:27.622223	1	\N	Transferência de saldo NuInvest	1.07	2025-10-01	credit	68dd1c6e-2fe4-48c0-9ec4-f14ad281d6ed	\N	Transferência de saldo NuInvest	\N	f	\N	\N	\N	f	Transferência de saldo NuInvest	\N
80	2025-10-30 19:22:33.558805	2025-12-26 14:03:27.628361	1	\N	Transferência enviada pelo Pix Lauzinho Goncalves de Oliveira •••449976•• BCO DO BRASIL SA (0001) Agência: 1479 Conta: 402664	68.20	2025-10-02	debit	68de57ab-64a2-4504-b550-e8bc9d1862b0	\N	Transferência enviada pelo Pix - Lauzinho Goncalves de Oliveira - •••.449.976-•• - BCO DO BRASIL S.A. (0001) Agência: 1479 Conta: 40266-4	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Lauzinho Goncalves de Oliveira •••449976•• BCO DO BRASIL SA (0001) Agência: 1479 Conta: 402664	\N
100	2025-10-30 19:22:33.57413	2025-12-26 14:03:27.639382	1	\N	Transferência enviada pelo Pix Nelson Pereira da Silva •••491156•• CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 12880000008692569010	40.00	2025-10-14	debit	68eec692-24b3-451e-9d75-6313bf442959	\N	Transferência enviada pelo Pix - Nelson Pereira da Silva - •••.491.156-•• - CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 1288000000869256901-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Nelson Pereira da Silva •••491156•• CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 12880000008692569010	\N
128	2025-10-30 19:22:33.591154	2025-12-26 14:03:27.653148	1	\N	Transferência enviada pelo Pix Bernardo Esteves de Souza Alves •••543526•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 730436378	36.31	2025-10-19	debit	68f53c3b-6f4f-4d57-9dba-0b7e7153da46	\N	Transferência enviada pelo Pix - Bernardo Esteves de Souza Alves - •••.543.526-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 73043637-8	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Bernardo Esteves de Souza Alves •••543526•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 730436378	\N
150	2025-10-30 19:22:33.599745	2025-12-26 14:03:27.664142	1	\N	Transferência enviada pelo Pix CARMELO MARIA MAE DA IGREJA E PAULO VI 18639435/000146 BCO DO BRASIL SA (0001) Agência: 104 Conta: 25305	15.00	2025-10-27	debit	68ff474b-55af-4eb4-a606-9eca48c22e6b	\N	Transferência enviada pelo Pix - CARMELO MARIA MAE DA IGREJA E PAULO VI - 18.639.435/0001-46 - BCO DO BRASIL S.A. (0001) Agência: 104 Conta: 2530-5	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix CARMELO MARIA MAE DA IGREJA E PAULO VI 18639435/000146 BCO DO BRASIL SA (0001) Agência: 104 Conta: 25305	\N
586	2025-12-26 14:40:31.569954	2025-12-29 13:46:20.966922	3	\N	Bsb Empreendimentos e	10.00	2025-11-25	debit	6924957b-b43b-4d8f-b1c3-6ddda06799a6	\N	Bsb Empreendimentos e	\N	f	\N	\N	\N	f	Bsb Empreendimentos e	\N
587	2025-12-26 14:40:31.580702	2025-12-29 13:46:20.968315	3	\N	Patricia Bicalho Viei	19.90	2025-11-25	debit	69248a67-2887-4067-a27d-2b1534c65265	\N	Patricia Bicalho Viei	\N	f	\N	\N	\N	f	Patricia Bicalho Viei	\N
588	2025-12-26 14:40:31.583748	2025-12-29 13:46:20.96966	3	\N	Mercadofacil	5.50	2025-11-25	debit	6924483d-d9d1-43bc-9ce6-cffe66bcd651	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
589	2025-12-26 14:40:31.587171	2025-12-29 13:46:20.971318	3	\N	Cordeiro Supermercados	395.39	2025-11-25	debit	6924a3ce-6173-47a1-9704-99aab95cfa92	\N	Cordeiro Supermercados	\N	f	\N	\N	\N	f	Cordeiro Supermercados	\N
590	2025-12-26 14:40:31.588805	2025-12-29 13:46:20.971938	3	\N	Amazon	24.86	2025-11-25	debit	6924b602-b25f-405c-813f-f34c8e221498	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
591	2025-12-26 14:40:31.589813	2025-12-29 13:46:20.972527	3	\N	Avatim Cheiros da Terr	153.50	2025-11-25	debit	69248c3d-3dd2-42e8-bb8a-4b44b6ce8aba	\N	Avatim Cheiros da Terr	\N	f	\N	\N	\N	f	Avatim Cheiros da Terr	\N
592	2025-12-26 14:40:31.590558	2025-12-29 13:46:20.973047	3	\N	Mercadofacil	85.00	2025-11-25	debit	6924480f-d92c-44ca-a21a-2f23894aac00	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
593	2025-12-26 14:40:31.591273	2025-12-29 13:46:20.97349	3	\N	Mercadofacil	63.81	2025-11-24	debit	69236f6a-1fc9-41fd-b1b8-4f4b0071fd29	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
594	2025-12-26 14:40:31.592807	2025-12-29 13:46:20.973983	3	\N	Mercadofacil	37.43	2025-11-24	debit	69237c14-3a0d-49fb-aac0-4ade06e6efb9	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
595	2025-12-26 14:40:31.593872	2025-12-29 13:46:20.974496	3	\N	Pagamento recebido	2414.17	2025-11-24	credit	6924d6bf-4eae-4ec1-bd75-691067ec2f77	\N	Pagamento recebido	\N	f	\N	\N	\N	f	Pagamento recebido	\N
585	2025-12-26 14:40:31.561134	2025-12-29 13:58:36.457531	3	\N	Estorno de AppleCom/Bill	51.29	2025-12-13	credit	692595cb-06d0-43bd-a73f-de331741c1ed	\N	Estorno de "Apple.Com/Bill"	\N	f	\N	\N	\N	f	AppleCom/Bill	\N
597	2025-12-26 14:40:31.595599	2025-12-29 13:46:21.002591	3	\N	Roka	259.80	2025-11-23	debit	6921ca9b-e61d-4894-a5c8-09eea1e9fe47	\N	Roka	\N	f	\N	\N	\N	f	Roka	\N
598	2025-12-26 14:40:31.596614	2025-12-29 13:46:21.003301	3	\N	Requinte Casa Moc	76.91	2025-11-23	debit	6921c7d5-ee47-4b88-84d8-2542decc3e12	\N	Requinte Casa Moc	\N	f	\N	\N	\N	f	Requinte Casa Moc	\N
599	2025-12-26 14:40:31.597469	2025-12-29 13:46:21.003877	3	\N	Barbaracristina	81.49	2025-11-23	debit	6921deba-3397-4ce6-9037-ec0b77b3db1e	\N	Barbaracristina	\N	f	\N	\N	\N	f	Barbaracristina	\N
601	2025-12-26 14:40:31.599	2025-12-29 13:46:21.005407	3	\N	Ifd*Oba Hamburgueria L	64.24	2025-11-23	debit	692231b9-ef85-4659-9940-fe66d97ab196	\N	Ifd*Oba Hamburgueria L	\N	f	\N	\N	\N	f	Ifd*Oba Hamburgueria L	\N
602	2025-12-26 14:40:31.600227	2025-12-29 13:46:21.005911	3	\N	Amazon	129.56	2025-11-23	debit	69201aa2-31e6-4b56-bed3-84d45b56d107	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
603	2025-12-26 14:40:31.601327	2025-12-29 13:46:21.006391	3	\N	Estacionamento Pio Xii	16.00	2025-11-23	debit	6921ceb6-b4cd-414c-99d9-66603fdd2b70	\N	Estacionamento Pio Xii	\N	f	\N	\N	\N	f	Estacionamento Pio Xii	\N
604	2025-12-26 14:40:31.602137	2025-12-29 13:46:21.006893	3	\N	Rede Facil	164.01	2025-11-22	debit	692069b2-a194-4254-9011-76eab00d10c7	\N	Rede Facil	\N	f	\N	\N	\N	f	Rede Facil	\N
605	2025-12-26 14:40:31.602855	2025-12-29 13:46:21.00736	3	\N	Barbaracristina	5.00	2025-11-22	debit	6920d51a-44aa-415f-84a5-194d1d130465	\N	Barbaracristina	\N	f	\N	\N	\N	f	Barbaracristina	\N
606	2025-12-26 14:40:31.603586	2025-12-29 13:46:21.007848	3	\N	Nortepec	147.90	2025-11-22	debit	692066e9-eaa8-4b9b-8836-36a14bef0096	\N	Nortepec	\N	f	\N	\N	\N	f	Nortepec	\N
607	2025-12-26 14:40:31.605621	2025-12-29 13:46:21.008338	3	\N	Natelson Souza Junior	15.40	2025-11-22	debit	6920afa2-b83e-48ea-90fe-076c0828a7f3	\N	Natelson Souza Junior	\N	f	\N	\N	\N	f	Natelson Souza Junior	\N
608	2025-12-26 14:40:31.606663	2025-12-29 13:46:21.008809	3	\N	Casadecarnes	66.00	2025-11-22	debit	6920b0f5-b51a-4480-bbf1-3bb6e7978fbc	\N	Casadecarnes	\N	f	\N	\N	\N	f	Casadecarnes	\N
609	2025-12-26 14:40:31.608314	2025-12-29 13:46:21.009275	3	\N	Erasmo Pampulha Tennis	31.00	2025-11-21	debit	691f6351-c4a5-4aa4-a43a-eaf0342c26a9	\N	Erasmo Pampulha Tennis	\N	f	\N	\N	\N	f	Erasmo Pampulha Tennis	\N
612	2025-12-26 14:40:31.612694	2025-12-29 13:46:21.010793	3	\N	Nu Seguro Vida	26.25	2025-11-20	debit	691f59e7-f3e1-4161-8c09-24acdcf1f7aa	\N	Nu Seguro Vida	\N	f	\N	\N	\N	f	Nu Seguro Vida	\N
613	2025-12-26 14:40:31.613428	2025-12-29 13:46:21.011299	3	\N	Mercadofacil	25.00	2025-11-20	debit	691dacda-a568-4e05-93f8-d1afb0dcd223	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
614	2025-12-26 14:40:31.614571	2025-12-29 13:46:21.011856	3	\N	Pagamento recebido	311.00	2025-11-20	credit	691ee564-32ef-459d-bcf0-0f0a608a0b64	\N	Pagamento recebido	\N	f	\N	\N	\N	f	Pagamento recebido	\N
615	2025-12-26 14:40:31.615699	2025-12-29 13:46:21.012385	3	\N	Villefort Atacadista	232.44	2025-11-19	debit	691c9898-145b-42c9-ac5b-1a315dd215e8	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
616	2025-12-26 14:40:31.616779	2025-12-29 13:46:21.012994	3	\N	Estacionamento Incor	16.00	2025-11-19	debit	691ccbb9-687b-4fab-a829-f3e35b49ba9e	\N	Estacionamento Incor	\N	f	\N	\N	\N	f	Estacionamento Incor	\N
617	2025-12-26 14:40:31.61768	2025-12-29 13:46:21.013524	3	\N	Amazon	99.90	2025-11-19	debit	691b2e3f-9c1f-4214-89b7-8823feb4c7b5	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
618	2025-12-26 14:40:31.618615	2025-12-29 13:46:21.013991	3	\N	Center Pao Supermercad	22.85	2025-11-18	debit	691afe24-07b9-41db-b020-d21c8744b4f3	\N	Center Pao Supermercad	\N	f	\N	\N	\N	f	Center Pao Supermercad	\N
619	2025-12-26 14:40:31.619398	2025-12-29 13:46:21.014445	3	\N	Eduardo Fernandes Ribe	68.00	2025-11-18	debit	691b8dda-1451-4c7f-a657-6c12687813e2	\N	Eduardo Fernandes Ribe	\N	f	\N	\N	\N	f	Eduardo Fernandes Ribe	\N
620	2025-12-26 14:40:31.62022	2025-12-29 13:46:21.014926	3	\N	Mapa de Minas	4.00	2025-11-18	debit	691b57b5-a8a4-4427-850b-795072d7c975	\N	Mapa de Minas	\N	f	\N	\N	\N	f	Mapa de Minas	\N
621	2025-12-26 14:40:31.621077	2025-12-29 13:46:21.015374	3	\N	Drogaria Minas Brasi	199.72	2025-11-18	debit	691b667a-dfdd-4aff-90d4-df73b165bbae	\N	Drogaria Minas Brasi	\N	f	\N	\N	\N	f	Drogaria Minas Brasi	\N
622	2025-12-26 14:40:31.621783	2025-12-29 13:46:21.015833	3	\N	Center Pao Supermercad	144.59	2025-11-18	debit	691b020a-4523-44fc-a4e7-976baa5927d4	\N	Center Pao Supermercad	\N	f	\N	\N	\N	f	Center Pao Supermercad	\N
623	2025-12-26 14:40:31.622772	2025-12-29 13:46:21.016315	3	\N	Pagamento recebido	503.16	2025-11-18	credit	691cc1d5-456a-462b-8d9c-57234e54c28e	\N	Pagamento recebido	\N	f	\N	\N	\N	f	Pagamento recebido	\N
624	2025-12-26 14:40:31.623781	2025-12-29 13:46:21.016918	3	\N	Barbaracristina	22.50	2025-11-17	debit	6919ee07-e919-4e4d-b680-7780d98a20c8	\N	Barbaracristina	\N	f	\N	\N	\N	f	Barbaracristina	\N
625	2025-12-26 14:40:31.625362	2025-12-29 13:46:21.017518	3	\N	Pagamento recebido	299.84	2025-11-17	credit	691b34f1-01c5-4dee-9554-9e36153a35a5	\N	Pagamento recebido	\N	f	\N	\N	\N	f	Pagamento recebido	\N
626	2025-12-26 14:40:31.62637	2025-12-29 13:46:21.01802	3	\N	Bsb Empreendimentos e	10.00	2025-11-16	debit	6918a6d8-ffe8-408f-9d0a-f24373894f45	\N	Bsb Empreendimentos e	\N	f	\N	\N	\N	f	Bsb Empreendimentos e	\N
627	2025-12-26 14:40:31.627426	2025-12-29 13:46:21.01852	3	\N	Octoo Bar	92.00	2025-11-16	debit	6918a257-fae5-4f46-8347-a04d8ac4c686	\N	Octoo Bar	\N	f	\N	\N	\N	f	Octoo Bar	\N
628	2025-12-26 14:40:31.628378	2025-12-29 13:46:21.019032	3	\N	Amazon	62.90	2025-11-16	debit	69186f2c-6178-4f00-b21b-af0c0251b676	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
629	2025-12-26 14:40:31.629173	2025-12-29 13:46:21.01949	3	\N	Pagamento recebido	2218.68	2025-11-15	credit	6918a64f-1f6d-4f20-8af9-f2ba918c5ef9	\N	Pagamento recebido	\N	f	\N	\N	\N	f	Pagamento recebido	\N
630	2025-12-26 14:40:31.630501	2025-12-29 13:46:21.020023	3	\N	Esfiha Express	155.60	2025-11-14	debit	69166464-a6cb-4e8d-ac12-506fa9200c9f	\N	Esfiha Express	\N	f	\N	\N	\N	f	Esfiha Express	\N
632	2025-12-26 14:40:31.63202	2025-12-29 13:46:21.021137	3	\N	Rota 01	6.00	2025-11-14	debit	6916209d-d619-43ef-9d0c-d59aff58da66	\N	Rota 01	\N	f	\N	\N	\N	f	Rota 01	\N
633	2025-12-26 14:40:31.63269	2025-12-29 13:46:21.021679	3	\N	Bsb Empreendimentos e	10.00	2025-11-14	debit	69166bb1-2fd0-4769-a9b9-d3b339cfbd3e	\N	Bsb Empreendimentos e	\N	f	\N	\N	\N	f	Bsb Empreendimentos e	\N
634	2025-12-26 14:40:31.633446	2025-12-29 13:46:21.022204	3	\N	Vanorteacessorios	21.00	2025-11-14	debit	6915d3f2-c772-4c96-8be8-798fef0b9d55	\N	Vanorteacessorios	\N	f	\N	\N	\N	f	Vanorteacessorios	\N
635	2025-12-26 14:40:31.634209	2025-12-29 13:46:21.022674	3	\N	Vanorteacessorios	103.80	2025-11-14	debit	69161476-27c1-4c70-ace9-42b4c6802869	\N	Vanorteacessorios	\N	f	\N	\N	\N	f	Vanorteacessorios	\N
638	2025-12-26 14:40:31.636206	2025-12-29 13:46:21.024141	3	\N	G G Ferragens Colonia	10.44	2025-11-14	debit	69161f0c-9150-41ef-b447-276018c3bfae	\N	G G Ferragens Colonia	\N	f	\N	\N	\N	f	G G Ferragens Colonia	\N
640	2025-12-26 14:40:31.639074	2025-12-29 13:46:21.0252	3	\N	Lupo	81.90	2025-11-14	debit	6916591f-b9f7-4ab8-9f8d-22a6a8f7ab6c	\N	Lupo	\N	f	\N	\N	\N	f	Lupo	\N
636	2025-12-26 14:40:31.634864	2025-12-29 13:46:21.024643	3	\N	Ajuste a crédito	0.90	2025-11-14	credit	6915fdb7-08d2-46aa-966b-d49f7351decc	\N	Ajuste a crédito	\N	f	\N	\N	\N	f	Ajuste a crédito	\N
641	2025-12-26 14:40:31.654368	2025-12-29 13:59:26.594491	3	\N	Levis Parcela 3/4	274.95	2025-12-28	debit	691657c9-220e-4c42-ac3e-433ad34364a9	\N	Levis - Parcela 3/4	\N	f	\N	\N	\N	f	Levis Parcela 1/4	\N
642	2025-12-26 14:40:31.655863	2025-12-29 13:46:21.027157	3	\N	Mercadolivre*Mercadol	93.76	2025-11-14	debit	6915e0be-708e-4bdf-bfac-89344f77186f	\N	Mercadolivre*Mercadol	\N	f	\N	\N	\N	f	Mercadolivre*Mercadol	\N
643	2025-12-26 14:40:31.656894	2025-12-29 13:46:21.027704	3	\N	Coco Tasty	4.00	2025-11-14	debit	691652e9-07ab-4518-ba72-830ac8d64caa	\N	Coco Tasty	\N	f	\N	\N	\N	f	Coco Tasty	\N
644	2025-12-26 14:40:31.657908	2025-12-29 13:46:21.028191	3	\N	Amazon Digital	14.95	2025-11-13	debit	69150fd2-b49f-4318-9734-167aa54a3b0d	\N	Amazon Digital	\N	f	\N	\N	\N	f	Amazon Digital	\N
645	2025-12-26 14:40:31.660498	2025-12-29 13:46:21.028681	3	\N	Embalamontes	169.00	2025-11-13	debit	69146cc9-ae24-41f8-ae18-cf634cda796c	\N	Embalamontes	\N	f	\N	\N	\N	f	Embalamontes	\N
600	2025-12-26 14:40:31.598257	2025-12-29 13:58:36.523777	3	\N	Estorno de Mercadolivre*Robertop	292.00	2025-11-27	credit	6921f8b2-2efc-41eb-8f37-659b6aa86fb7	\N	Estorno de "Mercadolivre*Robertop"	\N	f	\N	\N	\N	f	Mercadolivre*Robertop	\N
648	2025-12-26 14:40:31.662197	2025-12-29 13:46:21.030391	3	\N	Mercadolivre*Gabriel	25.90	2025-11-13	debit	6914f2f1-d3af-433d-8f04-90183e45eeeb	\N	Mercadolivre*Gabriel	\N	f	\N	\N	\N	f	Mercadolivre*Gabriel	\N
649	2025-12-26 14:40:31.662757	2025-12-29 13:46:21.03092	3	\N	Biscoitaria Cintra	33.70	2025-11-13	debit	69146a9c-2c12-47a7-98cd-1e4d9e5ddd45	\N	Biscoitaria Cintra	\N	f	\N	\N	\N	f	Biscoitaria Cintra	\N
650	2025-12-26 14:40:31.663238	2025-12-29 13:46:21.031404	3	\N	Posto Trevinho	265.34	2025-11-12	debit	691370ef-2d0b-41fa-bfc7-66e6f4c6ff80	\N	Posto Trevinho	\N	f	\N	\N	\N	f	Posto Trevinho	\N
651	2025-12-26 14:40:31.663688	2025-12-29 13:46:21.031899	3	\N	Supermercado Matias	11.77	2025-11-12	debit	69136898-f865-4636-bca0-d91812108116	\N	Supermercado Matias	\N	f	\N	\N	\N	f	Supermercado Matias	\N
652	2025-12-26 14:40:31.664148	2025-12-29 13:46:21.032363	3	\N	Arraialdoconto	125.00	2025-11-12	debit	691363e0-f21f-47ba-8f0e-c8f7575fa431	\N	Arraialdoconto	\N	f	\N	\N	\N	f	Arraialdoconto	\N
653	2025-12-26 14:40:31.664606	2025-12-29 13:46:21.032859	3	\N	Arraialdoconto	19.00	2025-11-12	debit	691364aa-7501-470a-a4f1-864c022f69c3	\N	Arraialdoconto	\N	f	\N	\N	\N	f	Arraialdoconto	\N
654	2025-12-26 14:40:31.665072	2025-12-29 13:59:26.593004	3	\N	Alfa Segurad*Auto Parcela 3/10	445.17	2025-12-28	debit	690d02f4-e901-432d-b46b-8ae373880316	\N	Alfa Segurad*Auto - Parcela 3/10	\N	f	\N	\N	\N	f	Alfa Segurad*Auto Parcela 1/10	\N
655	2025-12-26 14:40:31.665515	2025-12-29 13:46:21.033927	3	\N	Amazonmktplc*Raizverde	49.90	2025-11-11	debit	690f6af3-7b95-4aac-8bce-507263022390	\N	Amazonmktplc*Raizverde	\N	f	\N	\N	\N	f	Amazonmktplc*Raizverde	\N
656	2025-12-26 14:40:31.665987	2025-12-29 13:46:21.034497	3	\N	NuTag*SIA4F71	10.20	2025-11-11	debit	69138b27-2185-4243-8dcf-8be4420fafeb	\N	NuTag*SIA4F71	\N	f	\N	\N	\N	f	NuTag*SIA4F71	\N
657	2025-12-26 14:40:31.666473	2025-12-29 13:46:21.035132	3	\N	NuTag*SIA4F71	10.20	2025-11-11	debit	69136c55-81eb-4ff9-8525-8227b1561318	\N	NuTag*SIA4F71	\N	f	\N	\N	\N	f	NuTag*SIA4F71	\N
658	2025-12-26 14:40:31.667222	2025-12-29 13:46:21.035696	3	\N	NuTag*SIA4F71	10.20	2025-11-11	debit	69137887-d7ea-4746-a99f-aeb71fb56003	\N	NuTag*SIA4F71	\N	f	\N	\N	\N	f	NuTag*SIA4F71	\N
659	2025-12-26 14:40:31.66802	2025-12-29 13:46:21.036186	3	\N	NuTag*SIA4F71	10.20	2025-11-11	debit	69139b57-b234-4d0c-83f4-f93f5f5b0c32	\N	NuTag*SIA4F71	\N	f	\N	\N	\N	f	NuTag*SIA4F71	\N
660	2025-12-26 14:40:31.668619	2025-12-29 13:46:21.03667	3	\N	NuTag*SIA4F71	10.20	2025-11-11	debit	691382e4-58af-4be6-8e4c-2886b1a4d888	\N	NuTag*SIA4F71	\N	f	\N	\N	\N	f	NuTag*SIA4F71	\N
663	2025-12-26 14:40:31.670337	2025-12-29 13:46:21.038194	3	\N	AppleCom/Bill	19.90	2025-11-10	debit	69102580-327c-492a-96e8-bc51fbef170d	\N	Apple.Com/Bill	\N	f	\N	\N	\N	f	AppleCom/Bill	\N
664	2025-12-26 14:40:31.672296	2025-12-29 13:46:21.038678	3	\N	NuTag*SIA4F71	10.20	2025-11-09	debit	6910a7f2-2da5-46ef-b079-7994148431ed	\N	NuTag*SIA4F71	\N	f	\N	\N	\N	f	NuTag*SIA4F71	\N
665	2025-12-26 14:40:31.672841	2025-12-29 13:46:21.039186	3	\N	NuTag*SIA4F71	10.20	2025-11-09	debit	6910994e-54f3-4c55-996b-d3f0e2d959ba	\N	NuTag*SIA4F71	\N	f	\N	\N	\N	f	NuTag*SIA4F71	\N
666	2025-12-26 14:40:31.673319	2025-12-29 13:46:21.039662	3	\N	NuTag*SIA4F71	10.20	2025-11-09	debit	6910f9a9-2727-494c-9d8c-6ac8ee7c1ff1	\N	NuTag*SIA4F71	\N	f	\N	\N	\N	f	NuTag*SIA4F71	\N
669	2025-12-26 14:40:31.675161	2025-12-29 13:46:21.043231	3	\N	NuTag*SIA4F71	10.20	2025-11-09	debit	69108ef8-8628-4358-a9ba-b397d81ee76c	\N	NuTag*SIA4F71	\N	f	\N	\N	\N	f	NuTag*SIA4F71	\N
670	2025-12-26 14:40:31.675719	2025-12-29 13:46:21.043668	3	\N	Arautos D0004815450	260.00	2025-11-09	debit	690fdb1f-19d1-41b7-a0cb-a98d417e417b	\N	Arautos D0004815450	\N	f	\N	\N	\N	f	Arautos D0004815450	\N
671	2025-12-26 14:40:31.676359	2025-12-29 13:46:21.044123	3	\N	Erasmo Pampulha Tennis	89.27	2025-11-09	debit	690f64df-85d0-421c-82da-e6f9204f7114	\N	Erasmo Pampulha Tennis	\N	f	\N	\N	\N	f	Erasmo Pampulha Tennis	\N
672	2025-12-26 14:40:31.676958	2025-12-29 13:46:21.044551	3	\N	Villefort Atacadista	229.43	2025-11-09	debit	690fbb83-3f92-4e3e-b817-b2cf0a860b79	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
674	2025-12-26 14:40:31.677962	2025-12-29 13:46:21.045444	3	\N	NuTag*SIA4F71	10.20	2025-11-09	debit	69108344-9740-4263-b42c-dbd15c76eb7c	\N	NuTag*SIA4F71	\N	f	\N	\N	\N	f	NuTag*SIA4F71	\N
675	2025-12-26 14:40:31.678484	2025-12-29 13:46:21.045904	3	\N	Amazon	62.90	2025-11-09	debit	690df2d4-31ca-4a97-a9be-257b516543cb	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
676	2025-12-26 14:40:31.679005	2025-12-29 13:46:21.046348	3	\N	Mulher Moderna	80.00	2025-11-08	debit	690de5f7-64c0-453c-a69c-db39e6ba4cf9	\N	Mulher Moderna	\N	f	\N	\N	\N	f	Mulher Moderna	\N
677	2025-12-26 14:40:31.679487	2025-12-29 13:46:21.04683	3	\N	Strutural Participaca	9.00	2025-11-08	debit	690debe7-9e75-49c4-a6d0-209dc13fab97	\N	Strutural Participaca	\N	f	\N	\N	\N	f	Strutural Participaca	\N
678	2025-12-26 14:40:31.679948	2025-12-29 13:46:21.047369	3	\N	Peixaria Free Center	93.63	2025-11-08	debit	690df77b-d6fd-4f2a-9dbc-14a85c9eb3d7	\N	Peixaria Free Center	\N	f	\N	\N	\N	f	Peixaria Free Center	\N
679	2025-12-26 14:40:31.680391	2025-12-29 13:46:21.047832	3	\N	Rede Facil	216.00	2025-11-08	debit	690e3a0d-cb16-49fb-a7fa-a1b226b6d0f7	\N	Rede Facil	\N	f	\N	\N	\N	f	Rede Facil	\N
680	2025-12-26 14:40:31.680854	2025-12-29 13:46:21.048342	3	\N	Drogasil2831	118.54	2025-11-08	debit	690dcb7d-44e5-4421-bcb3-89e06cd7f2dc	\N	Drogasil2831	\N	f	\N	\N	\N	f	Drogasil2831	\N
681	2025-12-26 14:40:31.681289	2025-12-29 13:46:21.04881	3	\N	Amazon Digital	29.90	2025-11-08	debit	690dde42-1347-4f0d-98b3-8f1e85fcbdf9	\N	Amazon Digital	\N	f	\N	\N	\N	f	Amazon Digital	\N
682	2025-12-26 14:40:31.681721	2025-12-29 13:46:21.049278	3	\N	Amazon	133.84	2025-11-08	debit	690c4daa-312d-4257-a29f-987c494cd130	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
684	2025-12-26 14:40:31.685046	2025-12-29 13:46:21.050324	3	\N	Uber NuPay	15.98	2025-11-07	debit	690e5771-1eeb-45f5-993c-a997d3387658	\N	Uber - NuPay	\N	f	\N	\N	\N	f	Uber NuPay	\N
685	2025-12-26 14:40:31.685501	2025-12-29 13:46:21.050829	3	\N	Casadecarnes	7.97	2025-11-06	debit	690b9fee-5f76-4d51-b13e-0b32b4aa0225	\N	Casadecarnes	\N	f	\N	\N	\N	f	Casadecarnes	\N
686	2025-12-26 14:40:31.686297	2025-12-29 13:46:21.051384	3	\N	Larissavieira	21.50	2025-11-06	debit	690b4044-22ec-4555-97eb-8654d5378210	\N	Larissavieira	\N	f	\N	\N	\N	f	Larissavieira	\N
687	2025-12-26 14:40:31.686909	2025-12-29 13:46:21.051821	3	\N	Google One	149.90	2025-11-06	debit	6909f6fd-b2c6-4c07-8a39-fdbb2868323b	\N	Google One	\N	f	\N	\N	\N	f	Google One	\N
688	2025-12-26 14:40:31.687813	2025-12-29 13:46:21.052275	3	\N	Eduardo Fernandes Ribe	51.00	2025-11-06	debit	690b65bc-b9dc-4db5-a29f-bdd0df1c4f2d	\N	Eduardo Fernandes Ribe	\N	f	\N	\N	\N	f	Eduardo Fernandes Ribe	\N
690	2025-12-26 14:40:31.689195	2025-12-29 13:46:21.053179	3	\N	Tigo Lanches	76.00	2025-11-06	debit	690b633a-a219-45cf-a558-d0c2f1864dc9	\N	Tigo Lanches	\N	f	\N	\N	\N	f	Tigo Lanches	\N
691	2025-12-26 14:40:31.689696	2025-12-29 13:46:21.053655	3	\N	Natelson Souza Junior	13.86	2025-11-06	debit	690b9f35-756b-4bc5-9a56-a025976a6d13	\N	Natelson Souza Junior	\N	f	\N	\N	\N	f	Natelson Souza Junior	\N
692	2025-12-26 14:40:31.690204	2025-12-29 13:46:21.054118	3	\N	Amazon	69.94	2025-11-05	debit	69096e54-89a8-4e1a-8d18-f12a09de64c7	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
693	2025-12-26 14:40:31.690688	2025-12-29 13:46:21.054603	3	\N	Pagamento recebido	3886.13	2025-11-05	credit	690b9774-90b7-4b53-ab02-1b9934fb5a12	\N	Pagamento recebido	\N	f	\N	\N	\N	f	Pagamento recebido	\N
694	2025-12-26 14:40:31.691174	2025-12-29 13:46:21.055029	3	\N	Estorno de Amazon	1079.43	2025-11-05	credit	68f15c35-2750-4f24-b191-6e6bada3177d	\N	Estorno de "Amazon"	\N	f	\N	\N	\N	f	Estorno de Amazon	\N
695	2025-12-26 14:40:31.69169	2025-12-29 13:46:21.055524	3	\N	Villefort Atacadista	170.94	2025-11-04	debit	690920e8-69b6-462d-935d-3373a79df7b5	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
696	2025-12-26 14:40:31.692177	2025-12-29 13:46:21.055959	3	\N	Villefort Atacadista	252.22	2025-11-04	debit	690922bf-c2ab-4df4-b84f-f9ede55d0e90	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
683	2025-12-26 14:40:31.684525	2025-12-29 13:58:36.493979	3	\N	Estorno de Amazon Marketplace	3.27	2025-12-05	credit	690b56b6-6d45-465c-93d6-b31ae89f2d46	\N	Estorno de "Amazon Marketplace"	\N	f	\N	\N	\N	f	Amazon Marketplace	\N
689	2025-12-26 14:40:31.688513	2025-12-30 16:33:13.010334	3	4	Drogaria Minas Brasil	90.68	2025-11-06	debit	690b41e7-5bd0-4aff-bda0-bdf9a09f349c	\N	Drogaria Minas Brasil	\N	f	\N	\N	\N	f	Drogaria Minas Brasil	\N
844	2025-12-26 14:42:38.233189	2025-12-26 14:42:38.233189	3	\N	Compra de FII KNUQ11	16.34	2025-10-17	credit	68f23e24-ea05-4632-bd44-ef52e5020822	\N	Compra de FII - KNUQ11	\N	f	\N	\N	\N	f	Compra de FII KNUQ11	\N
698	2025-12-26 14:40:31.693199	2025-12-29 13:46:21.059064	3	\N	Laysalmeidaaguiar	40.00	2025-11-04	debit	6908c731-4d68-493a-babe-43ed850d48c6	\N	Laysalmeidaaguiar	\N	f	\N	\N	\N	f	Laysalmeidaaguiar	\N
700	2025-12-26 14:40:31.694123	2025-12-29 13:46:21.060094	3	\N	Casa da Esfiha	179.41	2025-11-03	debit	6907e4b2-0169-4de3-b798-3fea7b89eb4f	\N	Casa da Esfiha	\N	f	\N	\N	\N	f	Casa da Esfiha	\N
701	2025-12-26 14:40:31.694598	2025-12-29 13:46:21.060536	3	\N	Google One	9.99	2025-11-03	debit	69062dc1-614a-4dcf-b163-dd2783f25b87	\N	Google One	\N	f	\N	\N	\N	f	Google One	\N
702	2025-12-26 14:40:31.697159	2025-12-29 13:46:21.060999	3	\N	Padaria e Confeitaria	44.60	2025-11-03	debit	69076066-f76e-4efc-aa17-c577678a734a	\N	Padaria e Confeitaria	\N	f	\N	\N	\N	f	Padaria e Confeitaria	\N
703	2025-12-26 14:40:31.697711	2025-12-29 13:46:21.061415	3	\N	Fruta Norte	134.55	2025-11-02	debit	69061b68-11b5-419a-9e6e-8edae2eeab23	\N	Fruta Norte	\N	f	\N	\N	\N	f	Fruta Norte	\N
704	2025-12-26 14:40:31.698861	2025-12-29 13:46:21.061928	3	\N	Subway	75.50	2025-11-02	debit	690695af-4112-4b71-beea-29669e42c2a6	\N	Subway	\N	f	\N	\N	\N	f	Subway	\N
705	2025-12-26 14:40:31.699364	2025-12-29 13:46:21.062423	3	\N	Posto Esplanada	124.02	2025-11-02	debit	69062afb-dcdb-4c5f-a865-9d41f27cb7d7	\N	Posto Esplanada	\N	f	\N	\N	\N	f	Posto Esplanada	\N
706	2025-12-26 14:40:31.699872	2025-12-29 13:46:21.062915	3	\N	Amazon	42.50	2025-11-02	debit	69049611-ba11-4de6-a02f-d992d43a7f75	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
720	2025-12-26 14:40:31.709099	2025-12-30 16:33:13.013941	3	4	Drogaria Minas Brasil	41.48	2025-10-28	debit	68ff6897-9641-4816-8a8f-6d9f8dbde81f	\N	Drogaria Minas Brasil	\N	f	\N	\N	\N	f	Drogaria Minas Brasil	\N
708	2025-12-26 14:40:31.700897	2025-12-29 13:46:21.063824	3	\N	Sinval Tolentino Cama	35.99	2025-11-02	debit	69061af7-0936-4e8e-8300-cf3402c806fe	\N	Sinval Tolentino Cama	\N	f	\N	\N	\N	f	Sinval Tolentino Cama	\N
709	2025-12-26 14:40:31.701534	2025-12-29 13:46:21.064261	3	\N	Amazon	212.39	2025-11-01	debit	69037c5e-e76e-4059-9838-f348cd63c0ba	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
710	2025-12-26 14:40:31.70203	2025-12-29 13:46:21.064764	3	\N	Mercadofacil	7.62	2025-10-31	debit	69035a69-6443-401a-b326-e4db548c559d	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
711	2025-12-26 14:40:31.702472	2025-12-29 13:46:21.065256	3	\N	Drogarias Pacheco	73.17	2025-10-31	debit	6903c7a2-58e5-46d5-be5a-eda0a4ee937a	\N	Drogarias Pacheco	\N	f	\N	\N	\N	f	Drogarias Pacheco	\N
712	2025-12-26 14:40:31.702969	2025-12-29 13:46:21.06568	3	\N	Cia do Churrasco	83.88	2025-10-31	debit	690387a6-3b27-4078-ac6d-e8030caee7d5	\N	Cia do Churrasco	\N	f	\N	\N	\N	f	Cia do Churrasco	\N
713	2025-12-26 14:40:31.703468	2025-12-29 13:46:21.066117	3	\N	Casa da Esfiha	184.20	2025-10-31	debit	6903cb63-1745-4223-9a6f-78430e4f72a9	\N	Casa da Esfiha	\N	f	\N	\N	\N	f	Casa da Esfiha	\N
714	2025-12-26 14:40:31.703994	2025-12-29 13:46:21.066559	3	\N	Sineia Ferreira Aquino	69.80	2025-10-30	debit	69022176-7631-444a-aca9-186fc641591d	\N	Sineia Ferreira Aquino	\N	f	\N	\N	\N	f	Sineia Ferreira Aquino	\N
715	2025-12-26 14:40:31.704623	2025-12-29 13:46:21.06701	3	\N	Villefort Atacadista	121.75	2025-10-29	debit	6900fb65-9f19-4df5-a12a-c898c878e107	\N	Villefort Atacadista	\N	f	\N	\N	\N	f	Villefort Atacadista	\N
716	2025-12-26 14:40:31.705198	2025-12-29 13:46:21.067479	3	\N	Mercadolivre*Alleshop	269.90	2025-10-29	debit	6900b98a-3bb2-4ddc-99b5-ccf8fd01644d	\N	Mercadolivre*Alleshop	\N	f	\N	\N	\N	f	Mercadolivre*Alleshop	\N
727	2025-12-26 14:40:35.293199	2025-12-30 13:26:25.055513	3	\N	Transferência de saldo NuInvest	1.07	2025-12-01	credit	692d86fe-9f04-448c-abe2-9c286c8e1ff6	\N	Transferência de saldo NuInvest	\N	f	\N	\N	\N	f	Transferência de saldo NuInvest	\N
718	2025-12-26 14:40:31.706305	2025-12-29 13:46:21.068577	3	\N	Pagamento recebido	866.14	2025-10-29	credit	69021d35-d5b6-4f53-acb7-0b845c763953	\N	Pagamento recebido	\N	f	\N	\N	\N	f	Pagamento recebido	\N
719	2025-12-26 14:40:31.708543	2025-12-29 13:46:21.069048	3	\N	Cordeiro Supermercados	571.00	2025-10-29	debit	6900b5ae-9d69-48a4-a82a-2d260a1917c1	\N	Cordeiro Supermercados	\N	f	\N	\N	\N	f	Cordeiro Supermercados	\N
721	2025-12-26 14:40:31.709585	2025-12-29 13:46:21.069969	3	\N	Casadecarnes	4.59	2025-10-28	debit	68ff6ab0-7a94-42ce-b52a-c23c2da94c0c	\N	Casadecarnes	\N	f	\N	\N	\N	f	Casadecarnes	\N
722	2025-12-26 14:40:31.710079	2025-12-29 13:46:21.070379	3	\N	Amazon	69.16	2025-10-28	debit	68ffb20c-af11-418d-a90c-7f11e048f9b0	\N	Amazon	\N	f	\N	\N	\N	f	Amazon	\N
723	2025-12-26 14:40:31.710673	2025-12-29 13:46:21.070863	3	\N	Mercadofacil	3.81	2025-10-28	debit	68ffd267-9cd8-4289-90a4-aa92e04b4776	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
724	2025-12-26 14:40:31.711193	2025-12-29 13:46:21.071386	3	\N	61229155 Marli Cost	18.00	2025-10-28	debit	68ff6bdf-7c4c-413e-9282-8fcff910935b	\N	61.229.155 Marli Cost	\N	f	\N	\N	\N	f	61229155 Marli Cost	\N
726	2025-12-26 14:40:31.712404	2025-12-29 13:46:21.072343	3	\N	Mercadofacil	5.20	2025-10-28	debit	68ffcfcc-4530-44e0-98e2-c63d0f1f35af	\N	Mercadofacil	\N	f	\N	\N	\N	f	Mercadofacil	\N
717	2025-12-26 14:40:31.705713	2025-12-29 19:11:10.955741	3	50	Amazon Prime	19.90	2025-10-29	debit	690015df-9029-4b1c-9c01-23231609eb6b	\N	Amazonprimebr	\N	f	\N	\N	\N	f	Amazonprimebr	\N
729	2025-12-26 14:40:35.302622	2025-12-30 13:26:25.086186	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	175.09	2025-12-02	debit	692ed721-2ff5-4ec3-aeee-bb3601d49c19	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
730	2025-12-26 14:40:35.303944	2025-12-30 13:26:25.087448	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	39.95	2025-12-03	debit	69300b66-e1f4-4666-9519-0f8c33f4ee78	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
731	2025-12-26 14:40:35.30576	2025-12-30 13:26:25.096117	3	\N	Resgate RDB	330.00	2025-12-03	credit	69302bd8-e728-4f1b-b09a-b467d2e4d901	\N	Resgate RDB	\N	f	\N	\N	\N	f	Resgate RDB	\N
732	2025-12-26 14:40:35.307709	2025-12-30 13:26:25.097477	3	\N	Transferência enviada pelo Pix CENTRO DE TREINAMENTO FELIPE BANHA TEAM 59284212/000190 BCO SANTANDER (BRASIL) SA (0033) Agência: 1699 Conta: 130040391	330.00	2025-12-03	debit	69302c0e-a2d9-4eb8-a3ae-02107b4f34d2	\N	Transferência enviada pelo Pix - CENTRO DE TREINAMENTO FELIPE BANHA TEAM - 59.284.212/0001-90 - BCO SANTANDER (BRASIL) S.A. (0033) Agência: 1699 Conta: 13004039-1	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix CENTRO DE TREINAMENTO FELIPE BANHA TEAM 59284212/000190 BCO SANTANDER (BRASIL) SA (0033) Agência: 1699 Conta: 130040391	\N
707	2025-12-26 14:40:31.700393	2025-12-30 16:33:13.012066	3	4	Drogaria Minas Brasil	31.90	2025-11-02	debit	69062bab-37ce-49cf-b0ef-768f32a96021	\N	Drogaria Minas Brasil	\N	f	\N	\N	\N	f	Drogaria Minas Brasil	\N
725	2025-12-26 14:40:31.711691	2025-12-30 20:35:13.672364	3	4	Parcela Natação das Crianças	611.75	2025-12-28	debit	68d3fbb0-4620-481d-b976-4fd6c2421d3f	\N	Studio Junia Guimaraes - Parcela 5/8	\N	f	\N	\N	\N	f	Studio Junia Guimaraes Parcela 3/8	\N
746	2025-12-26 14:40:35.329799	2025-12-30 13:26:25.115486	3	\N	Transferência enviada pelo Pix Pedro Paulo Vasconcelos •••857976•• CAIXA ECONOMICA FEDERAL (0104) Agência: 132 Conta: 12880000008571551780	35.00	2025-12-08	debit	69372b47-6dfd-42e5-99cf-950f6a8585fd	\N	Transferência enviada pelo Pix - Pedro Paulo Vasconcelos - •••.857.976-•• - CAIXA ECONOMICA FEDERAL (0104) Agência: 132 Conta: 1288000000857155178-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Pedro Paulo Vasconcelos •••857976•• CAIXA ECONOMICA FEDERAL (0104) Agência: 132 Conta: 12880000008571551780	\N
743	2025-12-26 14:40:35.323488	2025-12-30 13:26:25.112524	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	150.00	2025-12-06	debit	6934bd48-84f5-44bf-87a7-e8e0eb28efbb	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
736	2025-12-26 14:40:35.315188	2025-12-30 13:26:25.103234	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	147.52	2025-12-04	debit	69321caf-dda7-423c-a7fe-515bce9b108d	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
734	2025-12-26 14:40:35.311867	2025-12-30 13:26:25.099724	3	3	Transferência enviada pelo Pix Lucas Almeida Aguiar •••115146•• CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 10000000000321199	7500.00	2025-12-03	debit	69305ed4-3775-485f-93f5-f11abbec6859	\N	Transferência enviada pelo Pix - Lucas Almeida Aguiar - •••.115.146-•• - CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 1000000000032119-9	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Lucas Almeida Aguiar •••115146•• CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 10000000000321199	\N
735	2025-12-26 14:40:35.31327	2025-12-30 13:26:25.101389	3	\N	Pagamento de fatura	5361.48	2025-12-03	debit	69305f0b-4302-42dc-a601-1df78ac7da98	\N	Pagamento de fatura	\N	f	\N	\N	\N	f	Pagamento de fatura	\N
737	2025-12-26 14:40:35.317104	2025-12-30 13:26:25.104579	3	\N	Transferência enviada pelo Pix AMIL ASSISTENCIA MEDICA INTERNACIONAL SA 29309127/000179 ITAÚ UNIBANCO SA (0341) Agência: 262 Conta: 583008	1315.10	2025-12-05	debit	6932b6c9-af14-4d28-a82b-5c53f9f72843	\N	Transferência enviada pelo Pix - AMIL ASSISTENCIA MEDICA INTERNACIONAL S.A. - 29.309.127/0001-79 - ITAÚ UNIBANCO S.A. (0341) Agência: 262 Conta: 58300-8	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix AMIL ASSISTENCIA MEDICA INTERNACIONAL SA 29309127/000179 ITAÚ UNIBANCO SA (0341) Agência: 262 Conta: 583008	\N
738	2025-12-26 14:40:35.31869	2025-12-30 13:26:25.107356	3	\N	Transferência enviada pelo Pix Sarah Giselle Barbosa de Aguiar •••196376•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 99097267	300.00	2025-12-05	debit	6932b6ea-240d-4627-9a12-ba1488404884	\N	Transferência enviada pelo Pix - Sarah Giselle Barbosa de Aguiar - •••.196.376-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 9909726-7	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Sarah Giselle Barbosa de Aguiar •••196376•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 99097267	\N
739	2025-12-26 14:40:35.319687	2025-12-30 13:26:25.108507	3	\N	Transferência enviada pelo Pix Multa (ESTADO DE MINAS GERAIS 18715615/000160 BCO SANTANDER (BRASIL) SA (0033) Agência: 3377 Conta: 290026715)	156.18	2025-12-05	debit	69334b9f-72b1-44f9-b435-f3fc392ed71c	\N	Transferência enviada pelo Pix - Multa (ESTADO DE MINAS GERAIS - 18.715.615/0001-60 - BCO SANTANDER (BRASIL) S.A. (0033) Agência: 3377 Conta: 29002671-5)	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Multa (ESTADO DE MINAS GERAIS 18715615/000160 BCO SANTANDER (BRASIL) SA (0033) Agência: 3377 Conta: 290026715)	\N
740	2025-12-26 14:40:35.320623	2025-12-30 13:26:25.109511	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	30.00	2025-12-06	debit	693492dd-3416-4c77-a7bf-dc67803c86ae	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
741	2025-12-26 14:40:35.321664	2025-12-30 13:26:25.110469	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	50.00	2025-12-06	debit	6934b1be-f2b3-4766-8a95-1dbd71f06cd9	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
742	2025-12-26 14:40:35.322672	2025-12-30 13:26:25.111477	3	\N	Pagamento de fatura	1716.12	2025-12-06	debit	6934b584-bce3-4215-8765-cb3001b4ba7f	\N	Pagamento de fatura	\N	f	\N	\N	\N	f	Pagamento de fatura	\N
744	2025-12-26 14:40:35.324537	2025-12-30 13:26:25.113736	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	280.13	2025-12-07	debit	69356051-78cb-4052-b44c-210237244fdd	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
745	2025-12-26 14:40:35.32767	2025-12-30 13:26:25.114662	3	\N	Pagamento de fatura	135.00	2025-12-07	debit	69356e71-9d7e-4500-9d6c-6b2125ea03f7	\N	Pagamento de fatura	\N	f	\N	\N	\N	f	Pagamento de fatura	\N
747	2025-12-26 14:40:35.331707	2025-12-30 13:26:25.116176	3	\N	Transferência enviada pelo Pix PAX MINAS MENDES ASSISTENCIA FUNERARIA LTDA 37831227/000199 CC SICOOB ENGECRED Agência: 3299 Conta: 422150	123.00	2025-12-09	debit	69381e06-793c-4e99-a3f6-9887ae5f830c	\N	Transferência enviada pelo Pix - PAX MINAS MENDES ASSISTENCIA FUNERARIA LTDA - 37.831.227/0001-99 - CC SICOOB ENGECRED Agência: 3299 Conta: 42215-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix PAX MINAS MENDES ASSISTENCIA FUNERARIA LTDA 37831227/000199 CC SICOOB ENGECRED Agência: 3299 Conta: 422150	\N
748	2025-12-26 14:40:35.332723	2025-12-30 13:26:25.116844	3	\N	Transferência enviada pelo Pix Diego Neri de Castro •••652806•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 482173264	390.00	2025-12-09	debit	69382103-430e-4b50-8560-f02caef88496	\N	Transferência enviada pelo Pix - Diego Neri de Castro - •••.652.806-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 48217326-4	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Diego Neri de Castro •••652806•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 482173264	\N
749	2025-12-26 14:40:35.333599	2025-12-30 13:26:25.117471	3	\N	Pagamento de fatura	1233.08	2025-12-09	debit	6938213d-eac4-4b92-a10a-e1429d6ec152	\N	Pagamento de fatura	\N	f	\N	\N	\N	f	Pagamento de fatura	\N
751	2025-12-26 14:40:35.335385	2025-12-30 13:26:25.127214	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	809.55	2025-12-09	debit	6938c4b3-0d79-4c8c-a8f9-fb856737f615	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
752	2025-12-26 14:40:35.336331	2025-12-30 13:26:25.140807	3	\N	Transferência de saldo NuInvest	41.40	2025-12-10	credit	6939653d-46ce-4125-bf41-e1f343a2d300	\N	Transferência de saldo NuInvest	\N	f	\N	\N	\N	f	Transferência de saldo NuInvest	\N
753	2025-12-26 14:40:35.337357	2025-12-30 13:26:25.141784	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	170.00	2025-12-10	debit	6939c9d8-b692-4c8b-b045-6a54b0cd4274	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
754	2025-12-26 14:40:35.338173	2025-12-30 13:26:25.142595	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	280.52	2025-12-11	debit	693aba11-69e3-4408-9fa0-380e2d951e42	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
755	2025-12-26 14:40:35.339006	2025-12-30 13:26:25.143464	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	318.09	2025-12-11	debit	693af239-839e-45c2-b398-3e3a97303b2b	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
756	2025-12-26 14:40:35.339759	2025-12-30 13:26:25.144262	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	30.00	2025-12-11	debit	693b1571-0799-4bad-96db-652733441ca8	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
757	2025-12-26 14:40:35.340824	2025-12-30 13:26:25.145002	3	\N	Transferência de saldo NuInvest	116.58	2025-12-12	credit	693c0b34-e2f1-492a-9062-de8c4c0bbd53	\N	Transferência de saldo NuInvest	\N	f	\N	\N	\N	f	Transferência de saldo NuInvest	\N
758	2025-12-26 14:40:35.342005	2025-12-30 13:26:25.14566	3	\N	Pagamento de fatura (saldo compartilhado)	2524.09	2025-12-12	debit	693c1605-0b4c-417a-9038-7755ef0c76fd	\N	Pagamento de fatura (saldo compartilhado)	\N	f	\N	\N	\N	f	Pagamento de fatura (saldo compartilhado)	\N
759	2025-12-26 14:40:35.342958	2025-12-30 13:26:25.146358	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	199.00	2025-12-12	debit	693c1d4d-1842-456d-8d82-3df4caf909f1	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
760	2025-12-26 14:40:35.344171	2025-12-30 13:26:25.147015	3	\N	Transferência enviada pelo Pix Fellipe Geraldo Pereira Botelho •••815276•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 56640864	565.00	2025-12-13	debit	693d8edf-efb5-4075-9157-a19327abf2a2	\N	Transferência enviada pelo Pix - Fellipe Geraldo Pereira Botelho - •••.815.276-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 5664086-4	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Fellipe Geraldo Pereira Botelho •••815276•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 56640864	\N
762	2025-12-26 14:40:35.347968	2025-12-30 13:26:25.148657	3	\N	Transferência enviada pelo Pix (saldo compartilhado) ASSOCIACAO BRASILEIRA ARAUTOS DO EVANGELHO CNPJ 03988329/001334 Conta 2372320	30.00	2025-12-14	debit	693ec39a-3cb2-432e-8f44-dde72b4aa1de	\N	Transferência enviada pelo Pix (saldo compartilhado) - ASSOCIACAO BRASILEIRA ARAUTOS DO EVANGELHO - CNPJ 03.988.329/0013-34 - Conta 237232-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix (saldo compartilhado) ASSOCIACAO BRASILEIRA ARAUTOS DO EVANGELHO CNPJ 03988329/001334 Conta 2372320	\N
763	2025-12-26 14:40:35.348829	2025-12-30 13:26:25.149252	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	178.75	2025-12-14	debit	693f2adf-a666-468d-b267-506743b6a12a	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
764	2025-12-26 14:40:35.34964	2025-12-30 13:26:25.149795	3	\N	Pagamento de boleto efetuado ASSOCIACAO PAMPULHA TENNIS	477.00	2025-12-15	debit	693e9f33-d7cc-456b-9eda-54b044442036	\N	Pagamento de boleto efetuado - ASSOCIACAO PAMPULHA TENNIS	\N	f	\N	\N	\N	f	Pagamento de boleto efetuado ASSOCIACAO PAMPULHA TENNIS	\N
765	2025-12-26 14:40:35.350447	2025-12-30 13:26:25.15033	3	\N	Transferência enviada pelo Pix CARMELO MARIA MAE DA IGREJA E PAULO VI 18639435/000146 BCO DO BRASIL SA (0001) Agência: 104 Conta: 25305	10.00	2025-12-15	debit	693fe49a-a25d-47a2-b0f7-b247b6f6cb64	\N	Transferência enviada pelo Pix - CARMELO MARIA MAE DA IGREJA E PAULO VI - 18.639.435/0001-46 - BCO DO BRASIL S.A. (0001) Agência: 104 Conta: 2530-5	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix CARMELO MARIA MAE DA IGREJA E PAULO VI 18639435/000146 BCO DO BRASIL SA (0001) Agência: 104 Conta: 25305	\N
766	2025-12-26 14:40:35.351416	2025-12-30 13:26:25.151078	3	\N	Pagamento de fatura (saldo compartilhado)	924.73	2025-12-16	debit	694141ca-479b-48bb-9a4e-8d50ac4ca47c	\N	Pagamento de fatura (saldo compartilhado)	\N	f	\N	\N	\N	f	Pagamento de fatura (saldo compartilhado)	\N
767	2025-12-26 14:40:35.352265	2025-12-30 13:26:25.151691	3	\N	Compra no débito ESTACIONAMENTO PIO XII	2.00	2025-12-16	debit	694182ad-f6bb-4370-aa1f-2923074a4ed3	\N	Compra no débito - ESTACIONAMENTO PIO XII	\N	f	\N	\N	\N	f	Compra no débito ESTACIONAMENTO PIO XII	\N
768	2025-12-26 14:40:35.35308	2025-12-30 13:26:25.15237	3	\N	Transferência enviada pelo Pix (saldo compartilhado) Lays Almeida Aguiar CPF •••115136•• Conta 54380034	500.00	2025-12-16	debit	694188d5-22a9-4354-aec8-63a91158e9bf	\N	Transferência enviada pelo Pix (saldo compartilhado) - Lays Almeida Aguiar - CPF •••.115.136-•• - Conta 5438003-4	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix (saldo compartilhado) Lays Almeida Aguiar CPF •••115136•• Conta 54380034	\N
770	2025-12-26 14:40:35.354607	2025-12-30 13:26:25.153947	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	259.40	2025-12-16	debit	6941b6be-92ff-493d-ac11-11b0294b1756	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
771	2025-12-26 14:40:35.355397	2025-12-30 13:26:25.154563	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	170.00	2025-12-17	debit	69430654-5f93-4ae4-9139-9b9cc271c752	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
772	2025-12-26 14:40:35.356138	2025-12-30 13:26:25.155115	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	80.00	2025-12-17	debit	694306b7-6f4d-4720-894c-ad92a3c58cea	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
773	2025-12-26 14:40:35.356898	2025-12-30 13:26:25.155657	3	\N	Resgate RDB	950.00	2025-12-17	credit	69431e6a-e89e-4d8d-a586-02c6b2ab9d3f	\N	Resgate RDB	\N	f	\N	\N	\N	f	Resgate RDB	\N
774	2025-12-26 14:40:35.35763	2025-12-30 13:26:25.15619	3	\N	Transferência enviada pelo Pix 53374321 BRUNO DE OLIVEIRA GOMES 53374321/000112 NU PAGAMENTOS IP (0260) Agência: 1 Conta: 8535657364	950.00	2025-12-17	debit	69431e86-fd99-46f3-b761-e25043a38cbc	\N	Transferência enviada pelo Pix - 53.374.321 BRUNO DE OLIVEIRA GOMES - 53.374.321/0001-12 - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 853565736-4	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix 53374321 BRUNO DE OLIVEIRA GOMES 53374321/000112 NU PAGAMENTOS IP (0260) Agência: 1 Conta: 8535657364	\N
775	2025-12-26 14:40:35.358341	2025-12-30 13:26:25.156907	3	\N	Pagamento de fatura (saldo compartilhado)	940.41	2025-12-17	debit	69431eaa-b082-48b2-9e10-3f27d88a38a6	\N	Pagamento de fatura (saldo compartilhado)	\N	f	\N	\N	\N	f	Pagamento de fatura (saldo compartilhado)	\N
776	2025-12-26 14:40:35.359034	2025-12-30 13:26:25.157517	3	\N	Pagamento de boleto efetuado (saldo compartilhado) KLISA COMUNICACAO & MULTMIDIA LTDA	109.90	2025-12-18	debit	693ffd19-29b0-4714-b1d2-f9e2fc08eca3	\N	Pagamento de boleto efetuado (saldo compartilhado) - KLISA COMUNICACAO & MULTMIDIA LTDA	\N	f	\N	\N	\N	f	Pagamento de boleto efetuado (saldo compartilhado) KLISA COMUNICACAO & MULTMIDIA LTDA	\N
777	2025-12-26 14:40:35.36017	2025-12-30 13:26:25.158145	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	100.00	2025-12-18	debit	6943d0ec-20af-4dc3-b406-3c74e78605ed	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
778	2025-12-26 14:40:35.361341	2025-12-30 13:26:25.159454	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	60.00	2025-12-18	debit	6944351d-39d3-4dd4-8f68-c7675386d51b	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
779	2025-12-26 14:40:35.362268	2025-12-30 13:26:25.160212	3	\N	Transferência enviada pelo Pix (saldo compartilhado) ROMERSON BRITO MESSIAS CPF •••331336•• Conta 4650514	700.00	2025-12-18	debit	69444188-05d6-47fe-956d-e6122ed6b199	\N	Transferência enviada pelo Pix (saldo compartilhado) - ROMERSON BRITO MESSIAS                   - CPF •••.331.336-•• - Conta 465051-4	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix (saldo compartilhado) ROMERSON BRITO MESSIAS CPF •••331336•• Conta 4650514	\N
780	2025-12-26 14:40:35.36368	2025-12-30 13:26:25.160886	3	\N	Transferência enviada pelo Pix JOYCE ALINE ARAUJO •••515256•• BCO C6 SA (0336) Agência: 1 Conta: 196035562	100.00	2025-12-18	debit	69444363-fa74-4996-973b-f26ce2fa323f	\N	Transferência enviada pelo Pix - JOYCE ALINE ARAUJO - •••.515.256-•• - BCO C6 S.A. (0336) Agência: 1 Conta: 19603556-2	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix JOYCE ALINE ARAUJO •••515256•• BCO C6 SA (0336) Agência: 1 Conta: 196035562	\N
781	2025-12-26 14:40:35.36467	2025-12-30 13:26:25.161578	3	\N	Pagamento de fatura (saldo compartilhado)	410.31	2025-12-18	debit	6944920f-1b4a-43fe-8058-22c24e97dcab	\N	Pagamento de fatura (saldo compartilhado)	\N	f	\N	\N	\N	f	Pagamento de fatura (saldo compartilhado)	\N
782	2025-12-26 14:40:35.3656	2025-12-30 13:26:25.162265	3	\N	Pagamento de boleto efetuado UNIMED NORTE DE MINAS	158.08	2025-12-18	debit	6944927c-ae46-4592-b4ac-207904ebab2d	\N	Pagamento de boleto efetuado - UNIMED NORTE DE MINAS	\N	f	\N	\N	\N	f	Pagamento de boleto efetuado UNIMED NORTE DE MINAS	\N
783	2025-12-26 14:40:35.366626	2025-12-30 13:26:25.162865	3	\N	Pagamento de boleto efetuado UNIMED NORTE DE MINAS	1504.65	2025-12-18	debit	6944929a-cddd-4121-97b3-172ef9d286f7	\N	Pagamento de boleto efetuado - UNIMED NORTE DE MINAS	\N	f	\N	\N	\N	f	Pagamento de boleto efetuado UNIMED NORTE DE MINAS	\N
784	2025-12-26 14:40:35.367532	2025-12-30 13:26:25.1635	3	\N	Transferência enviada pelo Pix (saldo compartilhado) AMIL ASSISTENCIA MEDICA INTERNACIONAL SA CNPJ 29309127/000179 Conta 583008	1283.55	2025-12-18	debit	69449380-b3da-4ca1-ab33-2f78bb7815b9	\N	Transferência enviada pelo Pix (saldo compartilhado) - AMIL ASSISTENCIA MEDICA INTERNACIONAL S.A. - CNPJ 29.309.127/0001-79 - Conta 58300-8	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix (saldo compartilhado) AMIL ASSISTENCIA MEDICA INTERNACIONAL SA CNPJ 29309127/000179 Conta 583008	\N
785	2025-12-26 14:40:35.368652	2025-12-30 13:26:25.164145	3	3	Pagamento de boleto efetuado (saldo compartilhado) COPASA MINAS GERAIS	1099.27	2025-12-19	debit	694493a4-bf07-4956-8e9d-832ac2dce238	\N	Pagamento de boleto efetuado (saldo compartilhado) - COPASA MINAS GERAIS	\N	f	\N	\N	\N	f	Pagamento de boleto efetuado (saldo compartilhado) COPASA MINAS GERAIS	\N
786	2025-12-26 14:40:35.370184	2025-12-30 13:26:25.164729	3	\N	Pagamento de boleto efetuado (saldo compartilhado) CEMIG DISTRIBUICAO	494.47	2025-12-19	debit	694493b8-6f48-4f58-b758-21d31ece96a8	\N	Pagamento de boleto efetuado (saldo compartilhado) - CEMIG DISTRIBUICAO	\N	f	\N	\N	\N	f	Pagamento de boleto efetuado (saldo compartilhado) CEMIG DISTRIBUICAO	\N
787	2025-12-26 14:40:35.371276	2025-12-30 13:26:25.165392	3	\N	Transferência de saldo NuInvest	132.64	2025-12-19	credit	69454225-6549-4279-8a9e-daa62b8202e7	\N	Transferência de saldo NuInvest	\N	f	\N	\N	\N	f	Transferência de saldo NuInvest	\N
838	2025-12-26 14:42:38.228067	2025-12-26 14:42:38.228067	3	\N	Aplicação RDB	350.00	2025-10-16	debit	68f15e6b-adf9-4efb-897a-2b48225c7525	\N	Aplicação RDB	\N	f	\N	\N	\N	f	Aplicação RDB	\N
839	2025-12-26 14:42:38.228903	2025-12-26 14:42:38.228903	3	\N	Aplicação RDB	100.00	2025-10-16	debit	68f15e86-5867-4a5e-8a78-266ff2e1cdfc	\N	Aplicação RDB	\N	f	\N	\N	\N	f	Aplicação RDB	\N
788	2025-12-26 14:40:35.37225	2025-12-30 13:26:25.166093	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	98.94	2025-12-19	debit	6945432c-bd9c-4492-bc75-46d714994a42	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
789	2025-12-26 14:40:35.37332	2025-12-30 13:26:25.166794	3	55	Transferência enviada pelo Pix A CASA DE RECUPERACAO VIDAS TRANSFORMADAS 31508698/000184 CORA SCFI (0403) Agência: 1 Conta: 35098533	50.00	2025-12-19	debit	6945a283-ab08-4557-a092-6344b48ed2ff	\N	Transferência enviada pelo Pix - A CASA DE RECUPERACAO VIDAS TRANSFORMADAS - 31.508.698/0001-84 - CORA SCFI (0403) Agência: 1 Conta: 3509853-3	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix A CASA DE RECUPERACAO VIDAS TRANSFORMADAS 31508698/000184 CORA SCFI (0403) Agência: 1 Conta: 35098533	\N
790	2025-12-26 14:40:35.374247	2025-12-30 13:26:25.167396	3	\N	Transferência enviada pelo Pix (saldo compartilhado) Victor Augusto de Azevedo Ferreira CPF •••827896•• Conta 427962536	250.00	2025-12-19	debit	6945b286-19a3-4359-8897-a1ab22ac7e44	\N	Transferência enviada pelo Pix (saldo compartilhado) - Victor Augusto de Azevedo Ferreira - CPF •••.827.896-•• - Conta 42796253-6	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix (saldo compartilhado) Victor Augusto de Azevedo Ferreira CPF •••827896•• Conta 427962536	\N
791	2025-12-26 14:40:35.375498	2025-12-30 13:26:25.167986	3	\N	Transferência enviada pelo Pix Eduardo Dias Cangussu •••332286•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 40378062	225.00	2025-12-20	debit	694690af-5c35-422a-b7c8-672cd88ee36d	\N	Transferência enviada pelo Pix - Eduardo Dias Cangussu - •••.332.286-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 4037806-2	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Eduardo Dias Cangussu •••332286•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 40378062	\N
792	2025-12-26 14:40:35.376401	2025-12-30 13:26:25.168737	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	25.00	2025-12-20	debit	694720b5-100b-4c4b-bbf6-c55c13626c6a	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
793	2025-12-26 14:40:35.377153	2025-12-30 13:26:25.169465	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	350.00	2025-12-21	debit	6947d023-f09d-48dd-9776-95472ad7d225	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
794	2025-12-26 14:40:35.377944	2025-12-30 13:26:25.170106	3	55	Transferência enviada pelo Pix (saldo compartilhado) ARQUIDIOCESE DE MONTES CLAROS CNPJ 16902314/000624 Conta 209198	15.00	2025-12-21	debit	6947f8cb-3d43-4d15-bdf1-e3e68caf51ea	\N	Transferência enviada pelo Pix (saldo compartilhado) - ARQUIDIOCESE DE MONTES CLAROS - CNPJ 16.902.314/0006-24 - Conta 20919-8	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix (saldo compartilhado) ARQUIDIOCESE DE MONTES CLAROS CNPJ 16902314/000624 Conta 209198	\N
795	2025-12-26 14:40:35.378777	2025-12-30 13:26:25.170758	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	217.90	2025-12-22	debit	694933d0-de03-4c73-a3e1-43c2fbdf7f11	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
796	2025-12-26 14:40:35.379615	2025-12-30 13:26:25.171344	3	55	Transferência enviada pelo Pix (saldo compartilhado) ARIDES KENNEDY FIEL CPF •••589526•• Conta 12880000007684827058	100.00	2025-12-22	debit	69494d7f-1a66-42bc-a8ca-4c1f0040b6f6	\N	Transferência enviada pelo Pix (saldo compartilhado) - ARIDES KENNEDY FIEL - CPF •••.589.526-•• - Conta 1288000000768482705-8	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix (saldo compartilhado) ARIDES KENNEDY FIEL CPF •••589526•• Conta 12880000007684827058	\N
798	2025-12-26 14:40:35.38108	2025-12-30 13:26:25.172508	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	119.20	2025-12-23	debit	694adcaa-50e5-4ae3-86d3-650e59d42ce6	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
799	2025-12-26 14:40:35.381938	2025-12-30 13:26:25.174821	3	\N	Transferência recebida pelo Pix HERBERTH GIULIANO AMARAL •••251786•• BCO C6 SA (0336) Agência: 1 Conta: 192397702	581.19	2025-12-23	credit	694ae8d4-6c1e-4a20-b66e-af3ce45346b4	\N	Transferência recebida pelo Pix - HERBERTH GIULIANO AMARAL - •••.251.786-•• - BCO C6 S.A. (0336) Agência: 1 Conta: 19239770-2	\N	f	\N	\N	\N	t	Transferência recebida pelo Pix HERBERTH GIULIANO AMARAL •••251786•• BCO C6 SA (0336) Agência: 1 Conta: 192397702	\N
801	2025-12-26 14:40:35.383838	2025-12-30 13:26:25.17744	3	54	Transferência enviada pelo Pix Miraita Maciel de Almeida •••893026•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 318014667	50.00	2025-12-24	debit	694c032a-7bb0-42b7-a3e1-e0a0552dae72	\N	Transferência enviada pelo Pix - Miraita Maciel de Almeida - •••.893.026-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 31801466-7	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Miraita Maciel de Almeida •••893026•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 318014667	\N
797	2025-12-26 14:40:35.380403	2025-12-30 16:30:53.496449	3	2	Lavagem do Carro	60.00	2025-12-22	debit	694970bf-6da7-473c-8ee0-a95466ef135e	\N	Transferência enviada pelo Pix (saldo compartilhado) - Nelson Pereira da Silva - CPF •••.491.156-•• - Conta 1288000000869256901-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix (saldo compartilhado) Nelson Pereira da Silva CPF •••491156•• Conta 12880000008692569010	\N
803	2025-12-26 14:42:38.178072	2025-12-26 14:42:38.178072	3	\N	Transferência de saldo NuInvest	1.07	2025-10-01	credit	68dd1c6e-2fe4-48c0-9ec4-f14ad281d6ed	\N	Transferência de saldo NuInvest	\N	f	\N	\N	\N	f	Transferência de saldo NuInvest	\N
804	2025-12-26 14:42:38.182948	2025-12-26 14:42:38.182948	3	\N	Transferência enviada pelo Pix Lauzinho Goncalves de Oliveira •••449976•• BCO DO BRASIL SA (0001) Agência: 1479 Conta: 402664	68.20	2025-10-02	debit	68de57ab-64a2-4504-b550-e8bc9d1862b0	\N	Transferência enviada pelo Pix - Lauzinho Goncalves de Oliveira - •••.449.976-•• - BCO DO BRASIL S.A. (0001) Agência: 1479 Conta: 40266-4	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Lauzinho Goncalves de Oliveira •••449976•• BCO DO BRASIL SA (0001) Agência: 1479 Conta: 402664	\N
805	2025-12-26 14:42:38.1852	2025-12-26 14:42:38.1852	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	268.88	2025-10-02	debit	68deb19a-cce4-49ee-a926-5dfcb18a7503	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
806	2025-12-26 14:42:38.188203	2025-12-26 14:42:38.188203	3	\N	Transferência enviada pelo Pix (saldo compartilhado) MIRAITA MACIEL DE ALMEIDA CPF •••893026•• Conta 120480	600.00	2025-10-02	debit	68ded5f0-c409-41bb-a7fa-f3d3ef3cf749	\N	Transferência enviada pelo Pix (saldo compartilhado) - MIRAITA MACIEL DE ALMEIDA - CPF •••.893.026-•• - Conta 12048-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix (saldo compartilhado) MIRAITA MACIEL DE ALMEIDA CPF •••893026•• Conta 120480	\N
807	2025-12-26 14:42:38.18964	2025-12-26 14:42:38.18964	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	31.90	2025-10-02	debit	68df0efc-f3c3-4d09-b404-d6fb45dc7893	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
808	2025-12-26 14:42:38.190692	2025-12-26 14:42:38.190692	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	93.32	2025-10-03	debit	68dfbc6a-234b-456b-90a5-8b7072d77660	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
809	2025-12-26 14:42:38.192054	2025-12-26 14:42:38.192054	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	123.37	2025-10-03	debit	68e00e44-0231-47b7-9229-55bfe676900d	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
810	2025-12-26 14:42:38.193288	2025-12-26 14:42:38.193288	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	112.37	2025-10-06	debit	68e45f07-a5b1-497c-97a3-770f3a75d4ee	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
840	2025-12-26 14:42:38.22964	2025-12-26 14:42:38.22964	3	\N	Aplicação RDB	100.00	2025-10-16	debit	68f15e9b-43e4-4865-a059-9bb45308b061	\N	Aplicação RDB	\N	f	\N	\N	\N	f	Aplicação RDB	\N
841	2025-12-26 14:42:38.230383	2025-12-26 14:42:38.230383	3	\N	Aplicação RDB	50.00	2025-10-16	debit	68f15eb0-3790-4c0c-a051-ca222154e0df	\N	Aplicação RDB	\N	f	\N	\N	\N	f	Aplicação RDB	\N
811	2025-12-26 14:42:38.195149	2025-12-26 14:42:38.195149	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	102.39	2025-10-06	debit	68e45f63-a647-4d65-8b07-113f891afdb8	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
812	2025-12-26 14:42:38.197205	2025-12-26 14:42:38.197205	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	68.00	2025-10-07	debit	68e56a3c-3157-43e6-b6e4-f40bb0cd8c23	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
813	2025-12-26 14:42:38.198311	2025-12-26 14:42:38.198311	3	\N	Resgate RDB	620.00	2025-10-08	credit	68e684f5-d35f-4b1e-96df-04340a21f670	\N	Resgate RDB	\N	f	\N	\N	\N	f	Resgate RDB	\N
814	2025-12-26 14:42:38.199285	2025-12-26 14:42:38.199285	3	\N	Transferência enviada pelo Pix Diego Neri de Castro •••652806•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 482173264	620.00	2025-10-08	debit	68e68527-f908-4513-9976-2291c9e9de4b	\N	Transferência enviada pelo Pix - Diego Neri de Castro - •••.652.806-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 48217326-4	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Diego Neri de Castro •••652806•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 482173264	\N
815	2025-12-26 14:42:38.200067	2025-12-26 14:42:38.200067	3	\N	Transferência Recebida CHRISTIAN FERREIRA CABRAL 46479098838 42306703/000192 NU PAGAMENTOS IP (0260) Agência: 1 Conta: 267128461	1485.00	2025-10-09	credit	68e8107d-55fa-4cff-a589-35cb4f480e77	\N	Transferência Recebida - CHRISTIAN FERREIRA CABRAL 46479098838 - 42.306.703/0001-92 - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 26712846-1	\N	f	\N	\N	\N	f	Transferência Recebida CHRISTIAN FERREIRA CABRAL 46479098838 42306703/000192 NU PAGAMENTOS IP (0260) Agência: 1 Conta: 267128461	\N
816	2025-12-26 14:42:38.201268	2025-12-26 14:42:38.201268	3	\N	Transferência de saldo NuInvest	21.25	2025-10-10	credit	68e8f798-59e6-44ad-96ed-c9b6498e224f	\N	Transferência de saldo NuInvest	\N	f	\N	\N	\N	f	Transferência de saldo NuInvest	\N
817	2025-12-26 14:42:38.203199	2025-12-26 14:42:38.203199	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	150.00	2025-10-10	debit	68e93c4f-33cc-4723-b8b1-d4bf172231c3	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
818	2025-12-26 14:42:38.204143	2025-12-26 14:42:38.204143	3	\N	Transferência enviada pelo Pix Victor Augusto de Azevedo Ferreira •••827896•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 427962536	250.00	2025-10-10	debit	68e96a49-467d-43a8-9256-565f4a7c689b	\N	Transferência enviada pelo Pix - Victor Augusto de Azevedo Ferreira - •••.827.896-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 42796253-6	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Victor Augusto de Azevedo Ferreira •••827896•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 427962536	\N
819	2025-12-26 14:42:38.204917	2025-12-26 14:42:38.204917	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	170.00	2025-10-10	debit	68e96a69-a2a8-4567-a322-823dbce98069	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
820	2025-12-26 14:42:38.205762	2025-12-26 14:42:38.205762	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	55.00	2025-10-10	debit	68e987da-3c86-4e24-88cf-4867126a6470	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
821	2025-12-26 14:42:38.206466	2025-12-26 14:42:38.206466	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	18.00	2025-10-10	debit	68e989ed-3f57-429c-bca5-bc4012f78699	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
822	2025-12-26 14:42:38.207204	2025-12-26 14:42:38.207204	3	\N	Transferência enviada pelo Pix MARIA ADELIA SANTOS •••924906•• STONE IP SA (0197) Agência: 1 Conta: 507204030	32.00	2025-10-10	debit	68e98adb-763d-4435-84b9-daa820997660	\N	Transferência enviada pelo Pix - MARIA ADELIA SANTOS - •••.924.906-•• - STONE IP S.A. (0197) Agência: 1 Conta: 50720403-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix MARIA ADELIA SANTOS •••924906•• STONE IP SA (0197) Agência: 1 Conta: 507204030	\N
823	2025-12-26 14:42:38.208016	2025-12-26 14:42:38.208016	3	\N	Transferência de saldo NuInvest	116.58	2025-10-14	credit	68ee433e-28eb-4bc0-86ec-65324718af9a	\N	Transferência de saldo NuInvest	\N	f	\N	\N	\N	f	Transferência de saldo NuInvest	\N
825	2025-12-26 14:42:38.21066	2025-12-26 14:42:38.21066	3	\N	Pagamento de boleto efetuado ALLIANZ SEGUROS SA	235.62	2025-10-15	debit	68ef81e9-c0d2-4723-8e77-181e8ef80a41	\N	Pagamento de boleto efetuado - ALLIANZ SEGUROS SA	\N	f	\N	\N	\N	f	Pagamento de boleto efetuado ALLIANZ SEGUROS SA	\N
826	2025-12-26 14:42:38.211761	2025-12-26 14:42:38.211761	3	\N	Pagamento de boleto efetuado ASSOCIACAO PAMPULHA TENNIS	477.00	2025-10-15	debit	68ef821d-172c-4812-a08f-a2cb2c609a77	\N	Pagamento de boleto efetuado - ASSOCIACAO PAMPULHA TENNIS	\N	f	\N	\N	\N	f	Pagamento de boleto efetuado ASSOCIACAO PAMPULHA TENNIS	\N
827	2025-12-26 14:42:38.213253	2025-12-26 14:42:38.213253	3	\N	Pagamento de boleto efetuado KLISA COMUNICACAO & MULTMIDIA LTDA	109.90	2025-10-15	debit	68ef822e-e1ad-4675-98ed-6b25f444e5d8	\N	Pagamento de boleto efetuado - KLISA COMUNICACAO & MULTMIDIA LTDA	\N	f	\N	\N	\N	f	Pagamento de boleto efetuado KLISA COMUNICACAO & MULTMIDIA LTDA	\N
828	2025-12-26 14:42:38.214283	2025-12-26 14:42:38.214283	3	\N	Resgate RDB	700.00	2025-10-16	credit	68f1476b-b816-42ad-8023-aed3dbfafefa	\N	Resgate RDB	\N	f	\N	\N	\N	f	Resgate RDB	\N
829	2025-12-26 14:42:38.215036	2025-12-26 14:42:38.215036	3	\N	Transferência enviada pelo Pix BRITO E BRITO BEM ESTAR MENTAL LTDA 28290759/000175 BANCO INTER (0077) Agência: 1 Conta: 331830477	700.00	2025-10-16	debit	68f14789-8afc-46f6-ba84-e0a08819c9f1	\N	Transferência enviada pelo Pix - BRITO E BRITO BEM ESTAR MENTAL LTDA - 28.290.759/0001-75 - BANCO INTER (0077) Agência: 1 Conta: 33183047-7	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix BRITO E BRITO BEM ESTAR MENTAL LTDA 28290759/000175 BANCO INTER (0077) Agência: 1 Conta: 331830477	\N
830	2025-12-26 14:42:38.21597	2025-12-26 14:42:38.21597	3	\N	Transferência Recebida SIRIUS EDICAO E SUPORTE TECNICO LTDA 29234819/000103 NU PAGAMENTOS IP (0260) Agência: 1 Conta: 924584522	39527.87	2025-10-16	credit	68f15bce-2ff3-4a32-9d2a-c029a88c6e43	\N	Transferência Recebida - SIRIUS EDICAO E SUPORTE TECNICO LTDA - 29.234.819/0001-03 - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 92458452-2	\N	f	\N	\N	\N	f	Transferência Recebida SIRIUS EDICAO E SUPORTE TECNICO LTDA 29234819/000103 NU PAGAMENTOS IP (0260) Agência: 1 Conta: 924584522	\N
831	2025-12-26 14:42:38.219652	2025-12-26 14:42:38.219652	3	\N	Transferência enviada pelo Pix Lucas Almeida Aguiar •••115146•• CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 10000000000321199	7500.00	2025-10-16	debit	68f15cee-b173-4814-a1ba-b779ac94afca	\N	Transferência enviada pelo Pix - Lucas Almeida Aguiar - •••.115.146-•• - CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 1000000000032119-9	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Lucas Almeida Aguiar •••115146•• CAIXA ECONOMICA FEDERAL (0104) Agência: 3044 Conta: 10000000000321199	\N
832	2025-12-26 14:42:38.221245	2025-12-26 14:42:38.221245	3	\N	Aplicação RDB	4000.00	2025-10-16	debit	68f15d86-9353-442b-824e-d9a7130c63ba	\N	Aplicação RDB	\N	f	\N	\N	\N	f	Aplicação RDB	\N
833	2025-12-26 14:42:38.222292	2025-12-26 14:42:38.222292	3	\N	Aplicação Fundo Nu Reserva Imediata Resp Ltda	400.00	2025-10-16	debit	68f15da0-591b-4568-8d66-cc942f3ae2cb	\N	Aplicação Fundo - Nu Reserva Imediata - Resp. Ltda	\N	f	\N	\N	\N	f	Aplicação Fundo Nu Reserva Imediata Resp Ltda	\N
834	2025-12-26 14:42:38.223061	2025-12-26 14:42:38.223061	3	\N	Compra de FII KNUQ11	1999.63	2025-10-16	debit	68f15de9-f813-45af-b819-e06e7116dc6e	\N	Compra de FII - KNUQ11	\N	f	\N	\N	\N	f	Compra de FII KNUQ11	\N
835	2025-12-26 14:42:38.223789	2025-12-26 14:42:38.223789	3	\N	Aplicação RDB	4000.00	2025-10-16	debit	68f15e10-7cee-43c8-b460-f783f4443da1	\N	Aplicação RDB	\N	f	\N	\N	\N	f	Aplicação RDB	\N
836	2025-12-26 14:42:38.225969	2025-12-26 14:42:38.225969	3	\N	Aplicação RDB	250.00	2025-10-16	debit	68f15e34-6b35-409b-9d2c-59a5696b1aae	\N	Aplicação RDB	\N	f	\N	\N	\N	f	Aplicação RDB	\N
837	2025-12-26 14:42:38.227123	2025-12-26 14:42:38.227123	3	\N	Aplicação RDB	700.00	2025-10-16	debit	68f15e4d-3fd7-42e5-8df4-280fcb1438da	\N	Aplicação RDB	\N	f	\N	\N	\N	f	Aplicação RDB	\N
842	2025-12-26 14:42:38.231126	2025-12-26 14:42:38.231126	3	\N	Pagamento de fatura	6885.79	2025-10-16	debit	68f19502-89fa-458d-bede-f1145dd4ab89	\N	Pagamento de fatura	\N	f	\N	\N	\N	f	Pagamento de fatura	\N
843	2025-12-26 14:42:38.23225	2025-12-26 14:42:38.23225	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	91.54	2025-10-17	debit	68f23105-c298-4bfa-8dc6-fc20ca4676ad	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
845	2025-12-26 14:42:38.233964	2025-12-26 14:42:38.233964	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	197.90	2025-10-17	debit	68f23ec2-439c-47a1-af0c-9c56caa9e90a	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
846	2025-12-26 14:42:38.234723	2025-12-26 14:42:38.234723	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	80.00	2025-10-17	debit	68f25f55-233d-49af-85be-5d1b5cb8b0bb	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
847	2025-12-26 14:42:38.235388	2025-12-26 14:42:38.235388	3	\N	Transferência enviada pelo Pix Lívia Moreira de Almeida •••945696•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 760220356	10.00	2025-10-17	debit	68f294b3-ef46-4674-987b-53b89ef6c879	\N	Transferência enviada pelo Pix - Lívia Moreira de Almeida - •••.945.696-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 76022035-6	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Lívia Moreira de Almeida •••945696•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 760220356	\N
848	2025-12-26 14:42:38.237763	2025-12-26 14:42:38.237763	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	55.00	2025-10-17	debit	68f2a16b-a001-447a-b3e4-d97377c02ebd	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
849	2025-12-26 14:42:38.238664	2025-12-26 14:42:38.238664	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	421.66	2025-10-17	debit	68f2d8f1-b53d-4ad5-8de7-e8505a49ab9c	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
850	2025-12-26 14:42:38.241011	2025-12-26 14:42:38.241011	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	814.44	2025-10-17	debit	68f2d91f-7f95-4c0f-9eac-d480e08647e4	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
851	2025-12-26 14:42:38.242013	2025-12-26 14:42:38.242013	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	120.00	2025-10-18	debit	68f38f29-cf34-4bc3-95eb-5abfadf99759	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
852	2025-12-26 14:42:38.242938	2025-12-26 14:42:38.242938	3	\N	Transferência enviada pelo Pix Bernardo Esteves de Souza Alves •••543526•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 730436378	36.31	2025-10-19	debit	68f53c3b-6f4f-4d57-9dba-0b7e7153da46	\N	Transferência enviada pelo Pix - Bernardo Esteves de Souza Alves - •••.543.526-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 73043637-8	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Bernardo Esteves de Souza Alves •••543526•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 730436378	\N
853	2025-12-26 14:42:38.243832	2025-12-26 14:42:38.243832	3	\N	Pagamento de fatura (saldo compartilhado)	1948.06	2025-10-19	debit	68f53c93-cfda-4663-b6c1-73bbca946eb0	\N	Pagamento de fatura (saldo compartilhado)	\N	f	\N	\N	\N	f	Pagamento de fatura (saldo compartilhado)	\N
854	2025-12-26 14:42:38.24473	2025-12-26 14:42:38.24473	3	\N	Pagamento de boleto efetuado (saldo compartilhado) ALLIANZ SEGUROS SA	241.91	2025-10-20	debit	67ffacf3-c7ca-4a1d-9a7a-03926af55496	\N	Pagamento de boleto efetuado (saldo compartilhado) - ALLIANZ SEGUROS SA	\N	f	\N	\N	\N	f	Pagamento de boleto efetuado (saldo compartilhado) ALLIANZ SEGUROS SA	\N
855	2025-12-26 14:42:38.246265	2025-12-26 14:42:38.246265	3	\N	Débito em conta	26.25	2025-10-20	debit	68f60627-5d32-42fc-b93f-a63944d6a864	\N	Débito em conta	\N	f	\N	\N	\N	f	Débito em conta	\N
856	2025-12-26 14:42:38.247771	2025-12-26 14:42:38.247771	3	\N	Transferência enviada pelo Pix (saldo compartilhado) Instituto Educacional Myrmex Ltda Me CNPJ 50114307/000191 Conta 130023310	2428.90	2025-10-20	debit	68f64af0-2f95-4c20-9311-f89e9c688b7c	\N	Transferência enviada pelo Pix (saldo compartilhado) - Instituto Educacional Myrmex Ltda Me - CNPJ 50.114.307/0001-91 - Conta 13002331-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix (saldo compartilhado) Instituto Educacional Myrmex Ltda Me CNPJ 50114307/000191 Conta 130023310	\N
857	2025-12-26 14:42:38.248821	2025-12-26 14:42:38.248821	3	\N	Transferência de saldo NuInvest	0.02	2025-10-20	credit	68f6733f-000c-485e-a751-75979fe6eec6	\N	Transferência de saldo NuInvest	\N	f	\N	\N	\N	f	Transferência de saldo NuInvest	\N
858	2025-12-26 14:42:38.25037	2025-12-26 14:42:38.25037	3	\N	Transferência enviada pelo Pix (saldo compartilhado) DALMIR FERREIRA DA SILVA CPF •••384886•• Conta 945339410	226.00	2025-10-20	debit	68f6be89-5fe3-49df-aaba-b797bc36a2de	\N	Transferência enviada pelo Pix (saldo compartilhado) - DALMIR FERREIRA DA SILVA - CPF •••.384.886-•• - Conta 94533941-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix (saldo compartilhado) DALMIR FERREIRA DA SILVA CPF •••384886•• Conta 945339410	\N
859	2025-12-26 14:42:38.251889	2025-12-26 14:42:38.251889	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	1283.55	2025-10-21	debit	68f7ee4c-86c5-4677-96d1-7df7f51ab760	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
860	2025-12-26 14:42:38.252743	2025-12-26 14:42:38.252743	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	260.71	2025-10-22	debit	68f8caa3-786d-4373-8444-9837e3a0af61	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
861	2025-12-26 14:42:38.253392	2025-12-26 14:42:38.253392	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	170.00	2025-10-22	debit	68f93342-7ebe-494b-bd7d-40beaffa2825	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
862	2025-12-26 14:42:38.254013	2025-12-26 14:42:38.254013	3	\N	Transferência Recebida Breno Silva Santos de Souza •••090266•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 31181892	70.00	2025-10-23	credit	68fa4ff1-f07c-402f-858f-07293824274e	\N	Transferência Recebida - Breno Silva Santos de Souza - •••.090.266-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 3118189-2	\N	f	\N	\N	\N	f	Transferência Recebida Breno Silva Santos de Souza •••090266•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 31181892	\N
863	2025-12-26 14:42:38.256749	2025-12-26 14:42:38.256749	3	\N	Transferência Recebida Victor Felipe Arthur Coutinho Ladeia •••548356•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 70790678	66.00	2025-10-23	credit	68fa4ffd-5f1f-4d71-9379-276cae884d5b	\N	Transferência Recebida - Victor Felipe Arthur Coutinho Ladeia - •••.548.356-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 7079067-8	\N	f	\N	\N	\N	f	Transferência Recebida Victor Felipe Arthur Coutinho Ladeia •••548356•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 70790678	\N
864	2025-12-26 14:42:38.257903	2025-12-26 14:42:38.257903	3	\N	Transferência Recebida Gaspar Leite Pereira Neto •••402926•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 73885028	70.00	2025-10-23	credit	68fa5025-c3cb-4116-ba89-1b9d14ec9031	\N	Transferência Recebida - Gaspar Leite Pereira Neto - •••.402.926-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 7388502-8	\N	f	\N	\N	\N	f	Transferência Recebida Gaspar Leite Pereira Neto •••402926•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 73885028	\N
865	2025-12-26 14:42:38.258805	2025-12-26 14:42:38.258805	3	\N	Transferência recebida pelo Pix ERICO PORTO TORRES •••777466•• BCO SANTANDER (BRASIL) SA (0033) Agência: 3504 Conta: 10824098	77.00	2025-10-23	credit	68fa5083-c0f2-4f43-a2c0-701be91f7b6a	\N	Transferência recebida pelo Pix - ERICO PORTO TORRES - •••.777.466-•• - BCO SANTANDER (BRASIL) S.A. (0033) Agência: 3504 Conta: 1082409-8	\N	f	\N	\N	\N	f	Transferência recebida pelo Pix ERICO PORTO TORRES •••777466•• BCO SANTANDER (BRASIL) SA (0033) Agência: 3504 Conta: 10824098	\N
866	2025-12-26 14:42:38.259851	2025-12-26 14:42:38.259851	3	\N	Transferência Recebida Fellipe Geraldo Pereira Botelho •••815276•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 56640864	77.88	2025-10-23	credit	68fa51d7-bc1a-44ef-9437-9af79a0e199d	\N	Transferência Recebida - Fellipe Geraldo Pereira Botelho - •••.815.276-•• - NU PAGAMENTOS - IP (0260) Agência: 1 Conta: 5664086-4	\N	f	\N	\N	\N	f	Transferência Recebida Fellipe Geraldo Pereira Botelho •••815276•• NU PAGAMENTOS IP (0260) Agência: 1 Conta: 56640864	\N
867	2025-12-26 14:42:38.266234	2025-12-26 14:42:38.266234	3	\N	Transferência enviada pelo Pix FERNANDO HENRIQUE LIMA MARTINS •••226146•• BCO BRADESCO SA (0237) Agência: 3049 Conta: 1160745	135.00	2025-10-23	debit	68fa9888-3170-4abb-8ef7-27d280d7c478	\N	Transferência enviada pelo Pix - FERNANDO HENRIQUE LIMA MARTINS - •••.226.146-•• - BCO BRADESCO S.A. (0237) Agência: 3049 Conta: 116074-5	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix FERNANDO HENRIQUE LIMA MARTINS •••226146•• BCO BRADESCO SA (0237) Agência: 3049 Conta: 1160745	\N
868	2025-12-26 14:42:38.267231	2025-12-26 14:42:38.267231	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	140.00	2025-10-24	debit	68fb8610-7e61-4bb3-b8d0-6460d519c156	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
869	2025-12-26 14:42:38.267978	2025-12-26 14:42:38.267978	3	\N	Transferência enviada pelo Pix Luciana Bezerra de Souza •••156738•• MERCADO PAGO IP LTDA (0323) Agência: 1 Conta: 53113168126	1.00	2025-10-24	debit	68fbd3c2-edf3-4517-8858-592b3d946f76	\N	Transferência enviada pelo Pix - Luciana Bezerra de Souza - •••.156.738-•• - MERCADO PAGO IP LTDA. (0323) Agência: 1 Conta: 5311316812-6	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Luciana Bezerra de Souza •••156738•• MERCADO PAGO IP LTDA (0323) Agência: 1 Conta: 53113168126	\N
870	2025-12-26 14:42:38.268763	2025-12-26 14:42:38.268763	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	172.53	2025-10-24	debit	68fbf338-5375-4a54-9eca-e2ae7d5334c4	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
871	2025-12-26 14:42:38.269486	2025-12-26 14:42:38.269486	3	\N	Transferência enviada pelo Pix (saldo compartilhado) Miraita Maciel de Almeida CPF •••893026•• Conta 318014667	300.00	2025-10-24	debit	68fbf4b4-2c41-4bd1-b259-a3b3be8c0413	\N	Transferência enviada pelo Pix (saldo compartilhado) - Miraita Maciel de Almeida - CPF •••.893.026-•• - Conta 31801466-7	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix (saldo compartilhado) Miraita Maciel de Almeida CPF •••893026•• Conta 318014667	\N
872	2025-12-26 14:42:38.27043	2025-12-26 14:42:38.27043	3	\N	Transferência enviada pelo Pix Miraita Maciel de Almeida •••893026•• CC CREDINOSSO Agência: 3327 Conta: 120480	100.00	2025-10-25	debit	68fce5b2-ce14-40eb-958f-78236430b14e	\N	Transferência enviada pelo Pix - Miraita Maciel de Almeida - •••.893.026-•• - CC CREDINOSSO Agência: 3327 Conta: 12048-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Miraita Maciel de Almeida •••893026•• CC CREDINOSSO Agência: 3327 Conta: 120480	\N
873	2025-12-26 14:42:38.271486	2025-12-26 14:42:38.271486	3	\N	Pagamento de fatura (saldo compartilhado)	1486.91	2025-10-25	debit	68fce5d4-0731-4c68-bbbd-5e4b2a8d6c6d	\N	Pagamento de fatura (saldo compartilhado)	\N	f	\N	\N	\N	f	Pagamento de fatura (saldo compartilhado)	\N
874	2025-12-26 14:42:38.272633	2025-12-26 14:42:38.272633	3	\N	Transferência enviada pelo Pix CARMELO MARIA MAE DA IGREJA E PAULO VI 18639435/000146 BCO DO BRASIL SA (0001) Agência: 104 Conta: 25305	15.00	2025-10-27	debit	68ff474b-55af-4eb4-a606-9eca48c22e6b	\N	Transferência enviada pelo Pix - CARMELO MARIA MAE DA IGREJA E PAULO VI - 18.639.435/0001-46 - BCO DO BRASIL S.A. (0001) Agência: 104 Conta: 2530-5	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix CARMELO MARIA MAE DA IGREJA E PAULO VI 18639435/000146 BCO DO BRASIL SA (0001) Agência: 104 Conta: 25305	\N
875	2025-12-26 14:42:38.274069	2025-12-26 14:42:38.274069	3	\N	Transferência enviada pelo Pix Pedro Paulo Vasconcelos •••857976•• CAIXA ECONOMICA FEDERAL (0104) Agência: 132 Conta: 12880000008571551780	35.00	2025-10-27	debit	68ffb0ce-a4b2-46f7-82e6-b5362a199d45	\N	Transferência enviada pelo Pix - Pedro Paulo Vasconcelos - •••.857.976-•• - CAIXA ECONOMICA FEDERAL (0104) Agência: 132 Conta: 1288000000857155178-0	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix Pedro Paulo Vasconcelos •••857976•• CAIXA ECONOMICA FEDERAL (0104) Agência: 132 Conta: 12880000008571551780	\N
877	2025-12-26 14:42:38.275637	2025-12-26 14:42:38.275637	3	\N	Transferência enviada pelo Pix (saldo compartilhado) SONIA SOPHIA ALVES BATISTA CPF •••780836•• Conta 482100486	100.00	2025-10-28	debit	690096d8-892a-4fea-a512-d560336baccc	\N	Transferência enviada pelo Pix (saldo compartilhado) - SONIA SOPHIA ALVES BATISTA - CPF •••.780.836-•• - Conta 48210048-6	\N	f	\N	\N	\N	f	Transferência enviada pelo Pix (saldo compartilhado) SONIA SOPHIA ALVES BATISTA CPF •••780836•• Conta 482100486	\N
878	2025-12-26 14:42:38.276464	2025-12-26 14:42:38.276464	3	\N	Transferência recebida pelo Pix LAYS ALMEIDA AGUIAR •••115136•• PAGSEGURO INTERNET IP SA (0290) Agência: 1 Conta: 759388499	269.00	2025-10-28	credit	6900bf10-77e7-4368-ab47-85c97b787c49	\N	Transferência recebida pelo Pix - LAYS ALMEIDA AGUIAR - •••.115.136-•• - PAGSEGURO INTERNET IP S.A. (0290) Agência: 1 Conta: 75938849-9	\N	f	\N	\N	\N	f	Transferência recebida pelo Pix LAYS ALMEIDA AGUIAR •••115136•• PAGSEGURO INTERNET IP SA (0290) Agência: 1 Conta: 759388499	\N
879	2025-12-26 14:42:38.277289	2025-12-26 14:42:38.277289	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	313.72	2025-10-28	debit	6900f372-b6b3-40d2-8376-3e73c8588ec2	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
880	2025-12-26 14:42:38.278008	2025-12-26 14:42:38.278008	3	\N	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	445.00	2025-10-28	debit	6901031b-ac9a-4575-b0d3-c6c9451b5806	\N	Movimento automático para realização de transação compartilhada - Raquel Sousa Leite - CPF •••.0556642-•• - Conta 16055798-5	\N	f	\N	\N	\N	f	Movimento automático para realização de transação compartilhada Raquel Sousa Leite CPF •••0556642•• Conta 160557985	\N
\.


--
-- Data for Name: user_organizations; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.user_organizations (user_organization_id, created_at, updated_at, user_id, organization_id, user_role) FROM stdin;
1	2025-10-29 11:31:43.335695	2025-10-29 11:31:43.335695	1	1	admin
3	2025-10-31 12:29:00.660143	2025-10-31 12:29:00.660143	2	2	admin
4	2025-12-26 13:45:17.027944	2025-12-26 13:45:17.027944	3	3	regular_manager
5	2025-12-26 14:39:30.029002	2025-12-26 14:39:30.029002	4	4	regular_manager
6	2025-12-26 14:39:40.800912	2025-12-26 14:39:40.800912	5	5	regular_manager
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: celeiro_user
--

COPY public.users (user_id, created_at, updated_at, email, name, phone, address, city, state, zip, country, latitude, longitude) FROM stdin;
1	2025-10-29 11:31:09.082847	2025-10-29 11:31:09.082847	test@example.com	Test User	0						0.00000000	0.00000000
2	2025-10-31 12:27:09.691321	2025-10-31 12:27:09.691321	test@celeiro.com	Test User	0						0.00000000	0.00000000
3	2025-12-26 13:45:17.027944	2025-12-26 13:45:17.027944	lucas.tamoios@gmail.com	lucas.tamoios	0						0.00000000	0.00000000
4	2025-12-26 14:39:30.029002	2025-12-26 14:39:30.029002	newuser_1766759969@example.com	newuser_1766759969	0						0.00000000	0.00000000
5	2025-12-26 14:39:40.800912	2025-12-26 14:39:40.800912	newuser_1766759980@example.com	newuser_1766759980	0						0.00000000	0.00000000
\.


--
-- Name: accounts_account_id_seq; Type: SEQUENCE SET; Schema: public; Owner: celeiro_user
--

SELECT pg_catalog.setval('public.accounts_account_id_seq', 5, true);


--
-- Name: advanced_patterns_pattern_id_seq; Type: SEQUENCE SET; Schema: public; Owner: celeiro_user
--

SELECT pg_catalog.setval('public.advanced_patterns_pattern_id_seq', 11, true);


--
-- Name: budget_items_budget_item_id_seq; Type: SEQUENCE SET; Schema: public; Owner: celeiro_user
--

SELECT pg_catalog.setval('public.budget_items_budget_item_id_seq', 4, true);


--
-- Name: budgets_budget_id_seq; Type: SEQUENCE SET; Schema: public; Owner: celeiro_user
--

SELECT pg_catalog.setval('public.budgets_budget_id_seq', 3, true);


--
-- Name: categories_category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: celeiro_user
--

SELECT pg_catalog.setval('public.categories_category_id_seq', 59, true);


--
-- Name: category_budgets_category_budget_id_seq; Type: SEQUENCE SET; Schema: public; Owner: celeiro_user
--

SELECT pg_catalog.setval('public.category_budgets_category_budget_id_seq', 37, true);


--
-- Name: goose_db_version_id_seq; Type: SEQUENCE SET; Schema: public; Owner: celeiro_user
--

SELECT pg_catalog.setval('public.goose_db_version_id_seq', 50, true);


--
-- Name: monthly_snapshots_snapshot_id_seq; Type: SEQUENCE SET; Schema: public; Owner: celeiro_user
--

SELECT pg_catalog.setval('public.monthly_snapshots_snapshot_id_seq', 1, true);


--
-- Name: organizations_organization_id_seq; Type: SEQUENCE SET; Schema: public; Owner: celeiro_user
--

SELECT pg_catalog.setval('public.organizations_organization_id_seq', 5, true);


--
-- Name: planned_entries_planned_entry_id_seq; Type: SEQUENCE SET; Schema: public; Owner: celeiro_user
--

SELECT pg_catalog.setval('public.planned_entries_planned_entry_id_seq', 61, true);


--
-- Name: planned_entry_statuses_status_id_seq; Type: SEQUENCE SET; Schema: public; Owner: celeiro_user
--

SELECT pg_catalog.setval('public.planned_entry_statuses_status_id_seq', 308, true);


--
-- Name: role_permissions_role_permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: celeiro_user
--

SELECT pg_catalog.setval('public.role_permissions_role_permission_id_seq', 33, true);


--
-- Name: savings_goals_savings_goal_id_seq; Type: SEQUENCE SET; Schema: public; Owner: celeiro_user
--

SELECT pg_catalog.setval('public.savings_goals_savings_goal_id_seq', 1, true);


--
-- Name: tags_tag_id_seq; Type: SEQUENCE SET; Schema: public; Owner: celeiro_user
--

SELECT pg_catalog.setval('public.tags_tag_id_seq', 1, true);


--
-- Name: transaction_tags_transaction_tag_id_seq; Type: SEQUENCE SET; Schema: public; Owner: celeiro_user
--

SELECT pg_catalog.setval('public.transaction_tags_transaction_tag_id_seq', 1, false);


--
-- Name: transactions_transaction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: celeiro_user
--

SELECT pg_catalog.setval('public.transactions_transaction_id_seq', 1293, true);


--
-- Name: user_organizations_user_organization_id_seq; Type: SEQUENCE SET; Schema: public; Owner: celeiro_user
--

SELECT pg_catalog.setval('public.user_organizations_user_organization_id_seq', 6, true);


--
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: celeiro_user
--

SELECT pg_catalog.setval('public.users_user_id_seq', 5, true);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (account_id);


--
-- Name: patterns advanced_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.patterns
    ADD CONSTRAINT advanced_patterns_pkey PRIMARY KEY (pattern_id);


--
-- Name: budget_items budget_items_budget_id_category_id_key; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_budget_id_category_id_key UNIQUE (budget_id, category_id);


--
-- Name: budget_items budget_items_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_pkey PRIMARY KEY (budget_item_id);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (budget_id);


--
-- Name: budgets budgets_user_id_month_year_key; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_user_id_month_year_key UNIQUE (user_id, month, year);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (category_id);


--
-- Name: category_budgets category_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.category_budgets
    ADD CONSTRAINT category_budgets_pkey PRIMARY KEY (category_budget_id);


--
-- Name: category_budgets category_budgets_user_id_organization_id_category_id_month__key; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.category_budgets
    ADD CONSTRAINT category_budgets_user_id_organization_id_category_id_month__key UNIQUE (user_id, organization_id, category_id, month, year);


--
-- Name: goose_db_version goose_db_version_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.goose_db_version
    ADD CONSTRAINT goose_db_version_pkey PRIMARY KEY (id);


--
-- Name: monthly_snapshots monthly_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.monthly_snapshots
    ADD CONSTRAINT monthly_snapshots_pkey PRIMARY KEY (snapshot_id);


--
-- Name: monthly_snapshots monthly_snapshots_user_id_organization_id_category_id_month_key; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.monthly_snapshots
    ADD CONSTRAINT monthly_snapshots_user_id_organization_id_category_id_month_key UNIQUE (user_id, organization_id, category_id, month, year);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (organization_id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (permission);


--
-- Name: planned_entries planned_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.planned_entries
    ADD CONSTRAINT planned_entries_pkey PRIMARY KEY (planned_entry_id);


--
-- Name: planned_entry_statuses planned_entry_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.planned_entry_statuses
    ADD CONSTRAINT planned_entry_statuses_pkey PRIMARY KEY (status_id);


--
-- Name: planned_entry_statuses planned_entry_statuses_planned_entry_id_month_year_key; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.planned_entry_statuses
    ADD CONSTRAINT planned_entry_statuses_planned_entry_id_month_year_key UNIQUE (planned_entry_id, month, year);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (role_permission_id);


--
-- Name: role_permissions role_permissions_role_name_permission_key; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_name_permission_key UNIQUE (role_name, permission);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_name);


--
-- Name: savings_goals savings_goals_organization_id_name_key; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.savings_goals
    ADD CONSTRAINT savings_goals_organization_id_name_key UNIQUE (organization_id, name);


--
-- Name: savings_goals savings_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.savings_goals
    ADD CONSTRAINT savings_goals_pkey PRIMARY KEY (savings_goal_id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (tag_id);


--
-- Name: tags tags_user_id_name_key; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_user_id_name_key UNIQUE (user_id, name);


--
-- Name: transaction_tags transaction_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.transaction_tags
    ADD CONSTRAINT transaction_tags_pkey PRIMARY KEY (transaction_tag_id);


--
-- Name: transaction_tags transaction_tags_transaction_id_tag_id_key; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.transaction_tags
    ADD CONSTRAINT transaction_tags_transaction_id_tag_id_key UNIQUE (transaction_id, tag_id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (transaction_id);


--
-- Name: user_organizations user_organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.user_organizations
    ADD CONSTRAINT user_organizations_pkey PRIMARY KEY (user_organization_id);


--
-- Name: user_organizations user_organizations_user_id_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.user_organizations
    ADD CONSTRAINT user_organizations_user_id_organization_id_key UNIQUE (user_id, organization_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_accounts_is_active; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_accounts_is_active ON public.accounts USING btree (is_active);


--
-- Name: idx_accounts_organization_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_accounts_organization_id ON public.accounts USING btree (organization_id);


--
-- Name: idx_accounts_user_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_accounts_user_id ON public.accounts USING btree (user_id);


--
-- Name: idx_budget_items_budget_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_budget_items_budget_id ON public.budget_items USING btree (budget_id);


--
-- Name: idx_budget_items_category_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_budget_items_category_id ON public.budget_items USING btree (category_id);


--
-- Name: idx_budgets_is_active; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_budgets_is_active ON public.budgets USING btree (is_active);


--
-- Name: idx_budgets_month_year; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_budgets_month_year ON public.budgets USING btree (month, year);


--
-- Name: idx_budgets_organization_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_budgets_organization_id ON public.budgets USING btree (organization_id);


--
-- Name: idx_budgets_user_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_budgets_user_id ON public.budgets USING btree (user_id);


--
-- Name: idx_categories_category_type; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_categories_category_type ON public.categories USING btree (category_type);


--
-- Name: idx_categories_is_system; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_categories_is_system ON public.categories USING btree (is_system);


--
-- Name: idx_categories_user_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_categories_user_id ON public.categories USING btree (user_id);


--
-- Name: idx_category_budgets_category_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_category_budgets_category_id ON public.category_budgets USING btree (category_id);


--
-- Name: idx_category_budgets_is_consolidated; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_category_budgets_is_consolidated ON public.category_budgets USING btree (is_consolidated);


--
-- Name: idx_category_budgets_month_year; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_category_budgets_month_year ON public.category_budgets USING btree (month, year);


--
-- Name: idx_category_budgets_organization_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_category_budgets_organization_id ON public.category_budgets USING btree (organization_id);


--
-- Name: idx_category_budgets_user_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_category_budgets_user_id ON public.category_budgets USING btree (user_id);


--
-- Name: idx_monthly_snapshots_category_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_monthly_snapshots_category_id ON public.monthly_snapshots USING btree (category_id);


--
-- Name: idx_monthly_snapshots_month_year; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_monthly_snapshots_month_year ON public.monthly_snapshots USING btree (month, year);


--
-- Name: idx_monthly_snapshots_organization_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_monthly_snapshots_organization_id ON public.monthly_snapshots USING btree (organization_id);


--
-- Name: idx_monthly_snapshots_user_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_monthly_snapshots_user_id ON public.monthly_snapshots USING btree (user_id);


--
-- Name: idx_patterns_active; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_patterns_active ON public.patterns USING btree (is_active);


--
-- Name: idx_patterns_category; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_patterns_category ON public.patterns USING btree (target_category_id);


--
-- Name: idx_patterns_user_org; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_patterns_user_org ON public.patterns USING btree (user_id, organization_id);


--
-- Name: idx_planned_entries_category_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_planned_entries_category_id ON public.planned_entries USING btree (category_id);


--
-- Name: idx_planned_entries_entry_type; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_planned_entries_entry_type ON public.planned_entries USING btree (entry_type);


--
-- Name: idx_planned_entries_is_recurrent; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_planned_entries_is_recurrent ON public.planned_entries USING btree (is_recurrent);


--
-- Name: idx_planned_entries_organization_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_planned_entries_organization_id ON public.planned_entries USING btree (organization_id);


--
-- Name: idx_planned_entries_parent_entry_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_planned_entries_parent_entry_id ON public.planned_entries USING btree (parent_entry_id);


--
-- Name: idx_planned_entries_pattern; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_planned_entries_pattern ON public.planned_entries USING btree (pattern_id);


--
-- Name: idx_planned_entries_savings_goal; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_planned_entries_savings_goal ON public.planned_entries USING btree (savings_goal_id);


--
-- Name: idx_planned_entries_user_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_planned_entries_user_id ON public.planned_entries USING btree (user_id);


--
-- Name: idx_planned_entry_statuses_entry; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_planned_entry_statuses_entry ON public.planned_entry_statuses USING btree (planned_entry_id);


--
-- Name: idx_planned_entry_statuses_month_year; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_planned_entry_statuses_month_year ON public.planned_entry_statuses USING btree (month, year);


--
-- Name: idx_planned_entry_statuses_status; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_planned_entry_statuses_status ON public.planned_entry_statuses USING btree (status);


--
-- Name: idx_planned_entry_statuses_transaction; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_planned_entry_statuses_transaction ON public.planned_entry_statuses USING btree (matched_transaction_id);


--
-- Name: idx_savings_goals_active; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_savings_goals_active ON public.savings_goals USING btree (is_active);


--
-- Name: idx_savings_goals_completed; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_savings_goals_completed ON public.savings_goals USING btree (is_completed);


--
-- Name: idx_savings_goals_type; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_savings_goals_type ON public.savings_goals USING btree (goal_type);


--
-- Name: idx_savings_goals_user_org; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_savings_goals_user_org ON public.savings_goals USING btree (user_id, organization_id);


--
-- Name: idx_tags_organization_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_tags_organization_id ON public.tags USING btree (organization_id);


--
-- Name: idx_tags_user_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_tags_user_id ON public.tags USING btree (user_id);


--
-- Name: idx_transaction_tags_tag_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_transaction_tags_tag_id ON public.transaction_tags USING btree (tag_id);


--
-- Name: idx_transaction_tags_transaction_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_transaction_tags_transaction_id ON public.transaction_tags USING btree (transaction_id);


--
-- Name: idx_transactions_account_date; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_transactions_account_date ON public.transactions USING btree (account_id, transaction_date DESC);


--
-- Name: idx_transactions_account_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_transactions_account_id ON public.transactions USING btree (account_id);


--
-- Name: idx_transactions_category_id; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_transactions_category_id ON public.transactions USING btree (category_id);


--
-- Name: idx_transactions_is_classified; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_transactions_is_classified ON public.transactions USING btree (is_classified);


--
-- Name: idx_transactions_is_ignored; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_transactions_is_ignored ON public.transactions USING btree (is_ignored);


--
-- Name: idx_transactions_ofx_fitid; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE UNIQUE INDEX idx_transactions_ofx_fitid ON public.transactions USING btree (account_id, ofx_fitid) WHERE (ofx_fitid IS NOT NULL);


--
-- Name: idx_transactions_original_description; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_transactions_original_description ON public.transactions USING gin (to_tsvector('portuguese'::regconfig, original_description));


--
-- Name: idx_transactions_savings_goal; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_transactions_savings_goal ON public.transactions USING btree (savings_goal_id);


--
-- Name: idx_transactions_transaction_date; Type: INDEX; Schema: public; Owner: celeiro_user
--

CREATE INDEX idx_transactions_transaction_date ON public.transactions USING btree (transaction_date);


--
-- Name: accounts accounts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id);


--
-- Name: accounts accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: accounts accounts_user_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_organization_id_fkey FOREIGN KEY (user_id, organization_id) REFERENCES public.user_organizations(user_id, organization_id);


--
-- Name: patterns advanced_patterns_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.patterns
    ADD CONSTRAINT advanced_patterns_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id) ON DELETE CASCADE;


--
-- Name: patterns advanced_patterns_target_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.patterns
    ADD CONSTRAINT advanced_patterns_target_category_id_fkey FOREIGN KEY (target_category_id) REFERENCES public.categories(category_id);


--
-- Name: patterns advanced_patterns_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.patterns
    ADD CONSTRAINT advanced_patterns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: budget_items budget_items_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(budget_id) ON DELETE CASCADE;


--
-- Name: budget_items budget_items_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.budget_items
    ADD CONSTRAINT budget_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id);


--
-- Name: budgets budgets_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id);


--
-- Name: budgets budgets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: budgets budgets_user_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_user_id_organization_id_fkey FOREIGN KEY (user_id, organization_id) REFERENCES public.user_organizations(user_id, organization_id);


--
-- Name: categories categories_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: category_budgets category_budgets_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.category_budgets
    ADD CONSTRAINT category_budgets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id) ON DELETE CASCADE;


--
-- Name: category_budgets category_budgets_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.category_budgets
    ADD CONSTRAINT category_budgets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id);


--
-- Name: category_budgets category_budgets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.category_budgets
    ADD CONSTRAINT category_budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: category_budgets category_budgets_user_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.category_budgets
    ADD CONSTRAINT category_budgets_user_id_organization_id_fkey FOREIGN KEY (user_id, organization_id) REFERENCES public.user_organizations(user_id, organization_id);


--
-- Name: monthly_snapshots monthly_snapshots_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.monthly_snapshots
    ADD CONSTRAINT monthly_snapshots_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id) ON DELETE CASCADE;


--
-- Name: monthly_snapshots monthly_snapshots_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.monthly_snapshots
    ADD CONSTRAINT monthly_snapshots_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id);


--
-- Name: monthly_snapshots monthly_snapshots_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.monthly_snapshots
    ADD CONSTRAINT monthly_snapshots_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: planned_entries planned_entries_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.planned_entries
    ADD CONSTRAINT planned_entries_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id) ON DELETE CASCADE;


--
-- Name: planned_entries planned_entries_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.planned_entries
    ADD CONSTRAINT planned_entries_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id);


--
-- Name: planned_entries planned_entries_parent_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.planned_entries
    ADD CONSTRAINT planned_entries_parent_entry_id_fkey FOREIGN KEY (parent_entry_id) REFERENCES public.planned_entries(planned_entry_id);


--
-- Name: planned_entries planned_entries_pattern_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.planned_entries
    ADD CONSTRAINT planned_entries_pattern_id_fkey FOREIGN KEY (pattern_id) REFERENCES public.patterns(pattern_id) ON DELETE SET NULL;


--
-- Name: planned_entries planned_entries_savings_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.planned_entries
    ADD CONSTRAINT planned_entries_savings_goal_id_fkey FOREIGN KEY (savings_goal_id) REFERENCES public.savings_goals(savings_goal_id) ON DELETE SET NULL;


--
-- Name: planned_entries planned_entries_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.planned_entries
    ADD CONSTRAINT planned_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: planned_entries planned_entries_user_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.planned_entries
    ADD CONSTRAINT planned_entries_user_id_organization_id_fkey FOREIGN KEY (user_id, organization_id) REFERENCES public.user_organizations(user_id, organization_id);


--
-- Name: planned_entry_statuses planned_entry_statuses_matched_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.planned_entry_statuses
    ADD CONSTRAINT planned_entry_statuses_matched_transaction_id_fkey FOREIGN KEY (matched_transaction_id) REFERENCES public.transactions(transaction_id) ON DELETE SET NULL;


--
-- Name: planned_entry_statuses planned_entry_statuses_planned_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.planned_entry_statuses
    ADD CONSTRAINT planned_entry_statuses_planned_entry_id_fkey FOREIGN KEY (planned_entry_id) REFERENCES public.planned_entries(planned_entry_id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permission_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_fkey FOREIGN KEY (permission) REFERENCES public.permissions(permission);


--
-- Name: role_permissions role_permissions_role_name_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_name_fkey FOREIGN KEY (role_name) REFERENCES public.roles(role_name);


--
-- Name: savings_goals savings_goals_user_id_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.savings_goals
    ADD CONSTRAINT savings_goals_user_id_organization_id_fkey FOREIGN KEY (user_id, organization_id) REFERENCES public.user_organizations(user_id, organization_id) ON DELETE CASCADE;


--
-- Name: tags tags_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id);


--
-- Name: tags tags_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: transaction_tags transaction_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.transaction_tags
    ADD CONSTRAINT transaction_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(tag_id) ON DELETE CASCADE;


--
-- Name: transaction_tags transaction_tags_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.transaction_tags
    ADD CONSTRAINT transaction_tags_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(transaction_id) ON DELETE CASCADE;


--
-- Name: transactions transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(account_id) ON DELETE CASCADE;


--
-- Name: transactions transactions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(category_id);


--
-- Name: transactions transactions_savings_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_savings_goal_id_fkey FOREIGN KEY (savings_goal_id) REFERENCES public.savings_goals(savings_goal_id) ON DELETE SET NULL;


--
-- Name: user_organizations user_organizations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.user_organizations
    ADD CONSTRAINT user_organizations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(organization_id);


--
-- Name: user_organizations user_organizations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.user_organizations
    ADD CONSTRAINT user_organizations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id);


--
-- Name: user_organizations user_organizations_user_role_fkey; Type: FK CONSTRAINT; Schema: public; Owner: celeiro_user
--

ALTER TABLE ONLY public.user_organizations
    ADD CONSTRAINT user_organizations_user_role_fkey FOREIGN KEY (user_role) REFERENCES public.roles(role_name);


--
-- PostgreSQL database dump complete
--

\unrestrict nQNpE3UxVb4aXipACkHJYoBhoKhePmFkwdrnmtw6cX75h5V6hMcBCdpKhOFVnIo

