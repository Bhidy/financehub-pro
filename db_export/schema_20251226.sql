--
-- PostgreSQL database dump
--

\restrict dd2Rt2JqYB9HbehZq5ro9oyaUD4tV9KspYFf9Z9AF2d9szqKyy0rNfgSu6Wtchv

-- Dumped from database version 14.20 (Homebrew)
-- Dumped by pg_dump version 14.20 (Homebrew)

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
-- Name: analyst_ratings; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.analyst_ratings (
    id integer NOT NULL,
    symbol character varying(20) NOT NULL,
    analyst_firm text NOT NULL,
    rating character varying(20),
    target_price numeric(12,4),
    current_price numeric(12,4),
    target_upside numeric(10,4),
    rating_date date,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.analyst_ratings OWNER TO home;

--
-- Name: analyst_ratings_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.analyst_ratings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.analyst_ratings_id_seq OWNER TO home;

--
-- Name: analyst_ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.analyst_ratings_id_seq OWNED BY public.analyst_ratings.id;


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.api_keys (
    id integer NOT NULL,
    user_id integer,
    key_hash character varying(255) NOT NULL,
    description character varying(255),
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.api_keys OWNER TO home;

--
-- Name: api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.api_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.api_keys_id_seq OWNER TO home;

--
-- Name: api_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.api_keys_id_seq OWNED BY public.api_keys.id;


--
-- Name: company_profiles; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.company_profiles (
    symbol character varying(20) NOT NULL,
    description text,
    website character varying(255),
    address text,
    phone character varying(50),
    logo_url text,
    officers jsonb DEFAULT '[]'::jsonb,
    peers jsonb DEFAULT '[]'::jsonb,
    last_updated timestamp with time zone DEFAULT now()
);


ALTER TABLE public.company_profiles OWNER TO home;

--
-- Name: corporate_actions; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.corporate_actions (
    id integer NOT NULL,
    symbol character varying(20),
    action_type character varying(50),
    announcement_date date,
    ex_date date,
    record_date date,
    payment_date date,
    amount numeric(10,4),
    currency character varying(10) DEFAULT 'SAR'::character varying,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.corporate_actions OWNER TO home;

--
-- Name: corporate_actions_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.corporate_actions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.corporate_actions_id_seq OWNER TO home;

--
-- Name: corporate_actions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.corporate_actions_id_seq OWNED BY public.corporate_actions.id;


--
-- Name: earnings_calendar; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.earnings_calendar (
    id integer NOT NULL,
    symbol character varying(20) NOT NULL,
    fiscal_quarter character varying(10),
    announcement_date date,
    eps_actual numeric(10,4),
    eps_estimate numeric(10,4),
    eps_surprise numeric(10,4),
    eps_surprise_percent numeric(8,4),
    revenue_actual numeric(18,4),
    revenue_estimate numeric(18,4),
    revenue_surprise_percent numeric(8,4),
    eps_yoy_change numeric(8,4),
    revenue_yoy_change numeric(8,4),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.earnings_calendar OWNER TO home;

--
-- Name: earnings_calendar_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.earnings_calendar_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.earnings_calendar_id_seq OWNER TO home;

--
-- Name: earnings_calendar_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.earnings_calendar_id_seq OWNED BY public.earnings_calendar.id;


--
-- Name: economic_indicators; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.economic_indicators (
    indicator_code character varying(50) NOT NULL,
    date date NOT NULL,
    value numeric(18,4),
    unit character varying(20),
    source character varying(100)
);


ALTER TABLE public.economic_indicators OWNER TO home;

--
-- Name: etfs; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.etfs (
    etf_id character varying(20) NOT NULL,
    etf_name character varying(255),
    tracking_index character varying(100),
    inception_date date,
    expense_ratio numeric(5,2),
    average_spread numeric(6,4),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.etfs OWNER TO home;

--
-- Name: fair_values; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.fair_values (
    id integer NOT NULL,
    symbol character varying(20) NOT NULL,
    valuation_model character varying(100),
    fair_value numeric(12,4),
    current_price numeric(12,4),
    upside_percent numeric(8,4),
    valuation_date date,
    assumptions jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.fair_values OWNER TO home;

--
-- Name: fair_values_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.fair_values_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.fair_values_id_seq OWNER TO home;

--
-- Name: fair_values_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.fair_values_id_seq OWNED BY public.fair_values.id;


--
-- Name: financial_ratios; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.financial_ratios (
    id integer NOT NULL,
    symbol character varying(20) NOT NULL,
    fiscal_year integer NOT NULL,
    period_type character varying(10) NOT NULL,
    date date NOT NULL,
    pe_ratio numeric(10,4),
    pb_ratio numeric(10,4),
    ps_ratio numeric(10,4),
    dividend_yield numeric(10,4),
    gross_margin numeric(10,4),
    operating_margin numeric(10,4),
    net_margin numeric(10,4),
    roe numeric(10,4),
    roa numeric(10,4),
    current_ratio numeric(10,4),
    quick_ratio numeric(10,4),
    debt_to_equity numeric(10,4),
    debt_to_assets numeric(10,4),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.financial_ratios OWNER TO home;

--
-- Name: financial_ratios_extended; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.financial_ratios_extended (
    id integer NOT NULL,
    symbol character varying(20) NOT NULL,
    fiscal_year integer NOT NULL,
    period_type character varying(10) DEFAULT 'FY'::character varying,
    pe_ratio numeric(10,4),
    pb_ratio numeric(10,4),
    ps_ratio numeric(10,4),
    ev_ebitda numeric(10,4),
    price_to_fcf numeric(10,4),
    gross_margin numeric(8,4),
    operating_margin numeric(8,4),
    net_margin numeric(8,4),
    roe numeric(8,4),
    roa numeric(8,4),
    roic numeric(8,4),
    current_ratio numeric(8,4),
    quick_ratio numeric(8,4),
    cash_ratio numeric(8,4),
    debt_to_equity numeric(10,4),
    debt_to_assets numeric(8,4),
    interest_coverage numeric(10,4),
    asset_turnover numeric(8,4),
    inventory_turnover numeric(8,4),
    receivables_turnover numeric(8,4),
    book_value_per_share numeric(12,4),
    tangible_book_per_share numeric(12,4),
    fcf_per_share numeric(12,4),
    dividend_per_share numeric(10,4),
    revenue_growth_yoy numeric(8,4),
    earnings_growth_yoy numeric(8,4),
    dividend_growth_yoy numeric(8,4),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.financial_ratios_extended OWNER TO home;

--
-- Name: financial_ratios_extended_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.financial_ratios_extended_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.financial_ratios_extended_id_seq OWNER TO home;

--
-- Name: financial_ratios_extended_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.financial_ratios_extended_id_seq OWNED BY public.financial_ratios_extended.id;


--
-- Name: financial_ratios_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.financial_ratios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.financial_ratios_id_seq OWNER TO home;

--
-- Name: financial_ratios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.financial_ratios_id_seq OWNED BY public.financial_ratios.id;


--
-- Name: financial_statements; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.financial_statements (
    id integer NOT NULL,
    symbol character varying(20) NOT NULL,
    period_type character varying(10) NOT NULL,
    fiscal_year integer NOT NULL,
    end_date date NOT NULL,
    revenue numeric(18,4),
    gross_profit numeric(18,4),
    operating_income numeric(18,4),
    net_income numeric(18,4),
    eps numeric(10,4),
    total_assets numeric(18,4),
    total_liabilities numeric(18,4),
    total_equity numeric(18,4),
    cash_flow_operating numeric(18,4),
    raw_data jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.financial_statements OWNER TO home;

--
-- Name: financial_statements_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.financial_statements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.financial_statements_id_seq OWNER TO home;

--
-- Name: financial_statements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.financial_statements_id_seq OWNED BY public.financial_statements.id;


--
-- Name: index_constituents; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.index_constituents (
    index_code character varying(20) NOT NULL,
    as_of_date date NOT NULL,
    symbol character varying(20) NOT NULL,
    weight_percent numeric(6,2),
    shares_in_index bigint,
    market_cap numeric(18,2)
);


ALTER TABLE public.index_constituents OWNER TO home;

--
-- Name: index_history; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.index_history (
    id integer NOT NULL,
    index_code character varying(50) NOT NULL,
    index_name_ar text,
    index_name_en text,
    date date NOT NULL,
    open numeric(12,4),
    high numeric(12,4),
    low numeric(12,4),
    close numeric(12,4),
    volume bigint,
    turnover numeric(18,4),
    change_percent numeric(8,4),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.index_history OWNER TO home;

--
-- Name: index_history_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.index_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.index_history_id_seq OWNER TO home;

--
-- Name: index_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.index_history_id_seq OWNED BY public.index_history.id;


--
-- Name: insider_trading; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.insider_trading (
    id integer NOT NULL,
    symbol character varying(20) NOT NULL,
    insider_name text NOT NULL,
    insider_role text,
    transaction_type character varying(10),
    shares integer,
    price_per_share numeric(12,4),
    value numeric(18,4),
    holdings_after bigint,
    transaction_date date,
    filing_date date,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.insider_trading OWNER TO home;

--
-- Name: insider_trading_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.insider_trading_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.insider_trading_id_seq OWNER TO home;

--
-- Name: insider_trading_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.insider_trading_id_seq OWNED BY public.insider_trading.id;


--
-- Name: insider_transactions; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.insider_transactions (
    id integer NOT NULL,
    symbol character varying(20),
    insider_name character varying(255),
    insider_role character varying(100),
    transaction_date date,
    transaction_type character varying(10),
    shares bigint,
    price numeric(10,4),
    value numeric(18,2),
    shares_held_after bigint,
    filing_date date,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.insider_transactions OWNER TO home;

--
-- Name: insider_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.insider_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.insider_transactions_id_seq OWNER TO home;

--
-- Name: insider_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.insider_transactions_id_seq OWNED BY public.insider_transactions.id;


--
-- Name: intraday_data; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.intraday_data (
    symbol character varying(20) NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    open numeric(12,4),
    high numeric(12,4),
    low numeric(12,4),
    close numeric(12,4),
    volume bigint
);


ALTER TABLE public.intraday_data OWNER TO home;

--
-- Name: intraday_ohlc; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.intraday_ohlc (
    symbol character varying(20) NOT NULL,
    "interval" character varying(5) NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    open numeric(10,4),
    high numeric(10,4),
    low numeric(10,4),
    close numeric(10,4),
    volume bigint
);


ALTER TABLE public.intraday_ohlc OWNER TO home;

--
-- Name: ipo_history; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.ipo_history (
    id integer NOT NULL,
    symbol character varying(20),
    company_name text NOT NULL,
    ipo_date date,
    offer_price numeric(12,4),
    first_day_close numeric(12,4),
    first_day_return numeric(8,4),
    shares_offered bigint,
    funds_raised numeric(18,4),
    subscription_multiple numeric(10,4),
    sector character varying(100),
    underwriter text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ipo_history OWNER TO home;

--
-- Name: ipo_history_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.ipo_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.ipo_history_id_seq OWNER TO home;

--
-- Name: ipo_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.ipo_history_id_seq OWNED BY public.ipo_history.id;


--
-- Name: major_shareholders; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.major_shareholders (
    id integer NOT NULL,
    symbol character varying(20) NOT NULL,
    shareholder_name text NOT NULL,
    shareholder_name_en text,
    ownership_percent numeric(8,4),
    shares_held bigint,
    shareholder_type character varying(50),
    as_of_date date,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.major_shareholders OWNER TO home;

--
-- Name: major_shareholders_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.major_shareholders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.major_shareholders_id_seq OWNER TO home;

--
-- Name: major_shareholders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.major_shareholders_id_seq OWNED BY public.major_shareholders.id;


--
-- Name: market_breadth; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.market_breadth (
    date date NOT NULL,
    market_code character varying(10) NOT NULL,
    total_stocks integer,
    advancing integer,
    declining integer,
    unchanged integer,
    new_highs integer,
    new_lows integer,
    advance_volume bigint,
    decline_volume bigint
);


ALTER TABLE public.market_breadth OWNER TO home;

--
-- Name: market_news; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.market_news (
    id integer NOT NULL,
    symbol character varying(20),
    headline text NOT NULL,
    source character varying(100),
    url text,
    published_at timestamp with time zone,
    sentiment_score numeric(5,4),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.market_news OWNER TO home;

--
-- Name: market_news_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.market_news_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.market_news_id_seq OWNER TO home;

--
-- Name: market_news_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.market_news_id_seq OWNED BY public.market_news.id;


--
-- Name: market_tickers; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.market_tickers (
    symbol character varying(20) NOT NULL,
    name_ar text,
    name_en text,
    market_code character varying(10),
    sector_name text,
    currency character varying(5) DEFAULT 'SAR'::character varying,
    last_price numeric(12,4),
    change numeric(12,4),
    change_percent numeric(12,4),
    volume bigint,
    last_updated timestamp with time zone DEFAULT now()
);


ALTER TABLE public.market_tickers OWNER TO home;

--
-- Name: mutual_funds; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.mutual_funds (
    fund_id character varying(50) NOT NULL,
    fund_name text NOT NULL,
    manager_name text,
    inception_date date,
    currency character varying(5) DEFAULT 'SAR'::character varying,
    latest_nav numeric(12,4),
    aum numeric(18,4),
    ytd_return numeric(10,4),
    one_year_return numeric(10,4),
    three_year_return numeric(10,4),
    last_updated timestamp with time zone DEFAULT now(),
    five_year_return numeric(10,4),
    sharpe_ratio numeric(16,4),
    standard_deviation numeric(16,4),
    expense_ratio numeric(5,2)
);


ALTER TABLE public.mutual_funds OWNER TO home;

--
-- Name: nav_history; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.nav_history (
    fund_id character varying(50) NOT NULL,
    date date NOT NULL,
    nav numeric(12,4) NOT NULL
);


ALTER TABLE public.nav_history OWNER TO home;

--
-- Name: ohlc_data; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.ohlc_data (
    symbol character varying(20) NOT NULL,
    date date NOT NULL,
    open numeric(12,4),
    high numeric(12,4),
    low numeric(12,4),
    close numeric(12,4),
    volume bigint
);


ALTER TABLE public.ohlc_data OWNER TO home;

--
-- Name: ohlc_history; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.ohlc_history (
    "time" timestamp with time zone NOT NULL,
    symbol character varying(20) NOT NULL,
    open numeric(12,4),
    high numeric(12,4),
    low numeric(12,4),
    close numeric(12,4),
    volume bigint,
    turnover numeric(18,4),
    transactions integer
);


ALTER TABLE public.ohlc_history OWNER TO home;

--
-- Name: order_book_snapshot; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.order_book_snapshot (
    symbol character varying(20) NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    level integer NOT NULL,
    bid_price numeric(10,4),
    bid_size bigint,
    bid_orders integer,
    ask_price numeric(10,4),
    ask_size bigint,
    ask_orders integer,
    spread numeric(6,4)
);


ALTER TABLE public.order_book_snapshot OWNER TO home;

--
-- Name: portfolio_holdings; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.portfolio_holdings (
    id integer NOT NULL,
    portfolio_id integer,
    symbol character varying(20),
    quantity integer NOT NULL,
    average_price numeric(18,4) NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.portfolio_holdings OWNER TO home;

--
-- Name: portfolio_holdings_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.portfolio_holdings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.portfolio_holdings_id_seq OWNER TO home;

--
-- Name: portfolio_holdings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.portfolio_holdings_id_seq OWNED BY public.portfolio_holdings.id;


--
-- Name: portfolios; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.portfolios (
    id integer NOT NULL,
    user_id character varying(50) NOT NULL,
    cash_balance numeric(18,4) DEFAULT 100000.00,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.portfolios OWNER TO home;

--
-- Name: portfolios_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.portfolios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.portfolios_id_seq OWNER TO home;

--
-- Name: portfolios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.portfolios_id_seq OWNED BY public.portfolios.id;


--
-- Name: sector_classification; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.sector_classification (
    symbol character varying(20) NOT NULL,
    sector_ar text,
    sector_en text,
    industry_ar text,
    industry_en text,
    sub_industry text,
    gics_code character varying(20),
    market_cap_category character varying(20),
    is_sharia_compliant boolean,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sector_classification OWNER TO home;

--
-- Name: sector_performance; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.sector_performance (
    sector_name character varying(100) NOT NULL,
    date date NOT NULL,
    change_percent numeric(10,4),
    volume bigint,
    turnover numeric(18,4)
);


ALTER TABLE public.sector_performance OWNER TO home;

--
-- Name: technical_levels; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.technical_levels (
    id integer NOT NULL,
    symbol character varying(20) NOT NULL,
    calc_date date NOT NULL,
    support_1 numeric(12,4),
    support_2 numeric(12,4),
    support_3 numeric(12,4),
    resistance_1 numeric(12,4),
    resistance_2 numeric(12,4),
    resistance_3 numeric(12,4),
    pivot_point numeric(12,4),
    sma_20 numeric(12,4),
    sma_50 numeric(12,4),
    sma_200 numeric(12,4),
    ema_12 numeric(12,4),
    ema_26 numeric(12,4),
    rsi_14 numeric(8,4),
    macd_line numeric(12,4),
    macd_signal numeric(12,4),
    macd_histogram numeric(12,4),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.technical_levels OWNER TO home;

--
-- Name: technical_levels_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.technical_levels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.technical_levels_id_seq OWNER TO home;

--
-- Name: technical_levels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.technical_levels_id_seq OWNED BY public.technical_levels.id;


--
-- Name: trade_history; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.trade_history (
    id integer NOT NULL,
    portfolio_id integer,
    symbol character varying(20) NOT NULL,
    side character varying(4) NOT NULL,
    quantity integer NOT NULL,
    price numeric(18,4) NOT NULL,
    total_value numeric(18,4) NOT NULL,
    executed_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.trade_history OWNER TO home;

--
-- Name: trade_history_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.trade_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.trade_history_id_seq OWNER TO home;

--
-- Name: trade_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.trade_history_id_seq OWNED BY public.trade_history.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    full_name character varying(100),
    role character varying(50) DEFAULT 'user'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO home;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO home;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: volume_statistics; Type: TABLE; Schema: public; Owner: home
--

CREATE TABLE public.volume_statistics (
    id integer NOT NULL,
    symbol character varying(20) NOT NULL,
    stat_date date NOT NULL,
    avg_volume_10d bigint,
    avg_volume_30d bigint,
    avg_volume_90d bigint,
    avg_turnover_10d numeric(18,4),
    avg_turnover_30d numeric(18,4),
    relative_volume numeric(8,4),
    trade_count integer,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.volume_statistics OWNER TO home;

--
-- Name: volume_statistics_id_seq; Type: SEQUENCE; Schema: public; Owner: home
--

CREATE SEQUENCE public.volume_statistics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.volume_statistics_id_seq OWNER TO home;

--
-- Name: volume_statistics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: home
--

ALTER SEQUENCE public.volume_statistics_id_seq OWNED BY public.volume_statistics.id;


--
-- Name: analyst_ratings id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.analyst_ratings ALTER COLUMN id SET DEFAULT nextval('public.analyst_ratings_id_seq'::regclass);


--
-- Name: api_keys id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);


--
-- Name: corporate_actions id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.corporate_actions ALTER COLUMN id SET DEFAULT nextval('public.corporate_actions_id_seq'::regclass);


--
-- Name: earnings_calendar id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.earnings_calendar ALTER COLUMN id SET DEFAULT nextval('public.earnings_calendar_id_seq'::regclass);


--
-- Name: fair_values id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.fair_values ALTER COLUMN id SET DEFAULT nextval('public.fair_values_id_seq'::regclass);


--
-- Name: financial_ratios id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.financial_ratios ALTER COLUMN id SET DEFAULT nextval('public.financial_ratios_id_seq'::regclass);


--
-- Name: financial_ratios_extended id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.financial_ratios_extended ALTER COLUMN id SET DEFAULT nextval('public.financial_ratios_extended_id_seq'::regclass);


--
-- Name: financial_statements id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.financial_statements ALTER COLUMN id SET DEFAULT nextval('public.financial_statements_id_seq'::regclass);


--
-- Name: index_history id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.index_history ALTER COLUMN id SET DEFAULT nextval('public.index_history_id_seq'::regclass);


--
-- Name: insider_trading id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.insider_trading ALTER COLUMN id SET DEFAULT nextval('public.insider_trading_id_seq'::regclass);


--
-- Name: insider_transactions id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.insider_transactions ALTER COLUMN id SET DEFAULT nextval('public.insider_transactions_id_seq'::regclass);


--
-- Name: ipo_history id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.ipo_history ALTER COLUMN id SET DEFAULT nextval('public.ipo_history_id_seq'::regclass);


--
-- Name: major_shareholders id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.major_shareholders ALTER COLUMN id SET DEFAULT nextval('public.major_shareholders_id_seq'::regclass);


--
-- Name: market_news id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.market_news ALTER COLUMN id SET DEFAULT nextval('public.market_news_id_seq'::regclass);


--
-- Name: portfolio_holdings id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.portfolio_holdings ALTER COLUMN id SET DEFAULT nextval('public.portfolio_holdings_id_seq'::regclass);


--
-- Name: portfolios id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.portfolios ALTER COLUMN id SET DEFAULT nextval('public.portfolios_id_seq'::regclass);


--
-- Name: technical_levels id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.technical_levels ALTER COLUMN id SET DEFAULT nextval('public.technical_levels_id_seq'::regclass);


--
-- Name: trade_history id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.trade_history ALTER COLUMN id SET DEFAULT nextval('public.trade_history_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: volume_statistics id; Type: DEFAULT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.volume_statistics ALTER COLUMN id SET DEFAULT nextval('public.volume_statistics_id_seq'::regclass);


--
-- Name: analyst_ratings analyst_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.analyst_ratings
    ADD CONSTRAINT analyst_ratings_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: company_profiles company_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.company_profiles
    ADD CONSTRAINT company_profiles_pkey PRIMARY KEY (symbol);


--
-- Name: corporate_actions corporate_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.corporate_actions
    ADD CONSTRAINT corporate_actions_pkey PRIMARY KEY (id);


--
-- Name: earnings_calendar earnings_calendar_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.earnings_calendar
    ADD CONSTRAINT earnings_calendar_pkey PRIMARY KEY (id);


--
-- Name: earnings_calendar earnings_calendar_symbol_fiscal_quarter_key; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.earnings_calendar
    ADD CONSTRAINT earnings_calendar_symbol_fiscal_quarter_key UNIQUE (symbol, fiscal_quarter);


--
-- Name: economic_indicators economic_indicators_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.economic_indicators
    ADD CONSTRAINT economic_indicators_pkey PRIMARY KEY (indicator_code, date);


--
-- Name: etfs etfs_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.etfs
    ADD CONSTRAINT etfs_pkey PRIMARY KEY (etf_id);


--
-- Name: fair_values fair_values_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.fair_values
    ADD CONSTRAINT fair_values_pkey PRIMARY KEY (id);


--
-- Name: fair_values fair_values_symbol_valuation_model_valuation_date_key; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.fair_values
    ADD CONSTRAINT fair_values_symbol_valuation_model_valuation_date_key UNIQUE (symbol, valuation_model, valuation_date);


--
-- Name: financial_ratios_extended financial_ratios_extended_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.financial_ratios_extended
    ADD CONSTRAINT financial_ratios_extended_pkey PRIMARY KEY (id);


--
-- Name: financial_ratios_extended financial_ratios_extended_symbol_fiscal_year_period_type_key; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.financial_ratios_extended
    ADD CONSTRAINT financial_ratios_extended_symbol_fiscal_year_period_type_key UNIQUE (symbol, fiscal_year, period_type);


--
-- Name: financial_ratios financial_ratios_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.financial_ratios
    ADD CONSTRAINT financial_ratios_pkey PRIMARY KEY (id);


--
-- Name: financial_ratios financial_ratios_symbol_fiscal_year_period_type_key; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.financial_ratios
    ADD CONSTRAINT financial_ratios_symbol_fiscal_year_period_type_key UNIQUE (symbol, fiscal_year, period_type);


--
-- Name: financial_statements financial_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.financial_statements
    ADD CONSTRAINT financial_statements_pkey PRIMARY KEY (id);


--
-- Name: financial_statements financial_statements_symbol_fiscal_year_period_type_key; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.financial_statements
    ADD CONSTRAINT financial_statements_symbol_fiscal_year_period_type_key UNIQUE (symbol, fiscal_year, period_type);


--
-- Name: index_constituents index_constituents_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.index_constituents
    ADD CONSTRAINT index_constituents_pkey PRIMARY KEY (index_code, as_of_date, symbol);


--
-- Name: index_history index_history_index_code_date_key; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.index_history
    ADD CONSTRAINT index_history_index_code_date_key UNIQUE (index_code, date);


--
-- Name: index_history index_history_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.index_history
    ADD CONSTRAINT index_history_pkey PRIMARY KEY (id);


--
-- Name: insider_trading insider_trading_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.insider_trading
    ADD CONSTRAINT insider_trading_pkey PRIMARY KEY (id);


--
-- Name: insider_transactions insider_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.insider_transactions
    ADD CONSTRAINT insider_transactions_pkey PRIMARY KEY (id);


--
-- Name: intraday_data intraday_data_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.intraday_data
    ADD CONSTRAINT intraday_data_pkey PRIMARY KEY (symbol, "timestamp");


--
-- Name: intraday_ohlc intraday_ohlc_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.intraday_ohlc
    ADD CONSTRAINT intraday_ohlc_pkey PRIMARY KEY (symbol, "interval", "timestamp");


--
-- Name: ipo_history ipo_history_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.ipo_history
    ADD CONSTRAINT ipo_history_pkey PRIMARY KEY (id);


--
-- Name: ipo_history ipo_history_symbol_key; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.ipo_history
    ADD CONSTRAINT ipo_history_symbol_key UNIQUE (symbol);


--
-- Name: major_shareholders major_shareholders_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.major_shareholders
    ADD CONSTRAINT major_shareholders_pkey PRIMARY KEY (id);


--
-- Name: major_shareholders major_shareholders_symbol_shareholder_name_as_of_date_key; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.major_shareholders
    ADD CONSTRAINT major_shareholders_symbol_shareholder_name_as_of_date_key UNIQUE (symbol, shareholder_name, as_of_date);


--
-- Name: market_breadth market_breadth_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.market_breadth
    ADD CONSTRAINT market_breadth_pkey PRIMARY KEY (date, market_code);


--
-- Name: market_news market_news_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.market_news
    ADD CONSTRAINT market_news_pkey PRIMARY KEY (id);


--
-- Name: market_news market_news_url_key; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.market_news
    ADD CONSTRAINT market_news_url_key UNIQUE (url);


--
-- Name: market_tickers market_tickers_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.market_tickers
    ADD CONSTRAINT market_tickers_pkey PRIMARY KEY (symbol);


--
-- Name: mutual_funds mutual_funds_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.mutual_funds
    ADD CONSTRAINT mutual_funds_pkey PRIMARY KEY (fund_id);


--
-- Name: nav_history nav_history_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.nav_history
    ADD CONSTRAINT nav_history_pkey PRIMARY KEY (fund_id, date);


--
-- Name: ohlc_data ohlc_data_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.ohlc_data
    ADD CONSTRAINT ohlc_data_pkey PRIMARY KEY (symbol, date);


--
-- Name: ohlc_history ohlc_history_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.ohlc_history
    ADD CONSTRAINT ohlc_history_pkey PRIMARY KEY ("time", symbol);


--
-- Name: order_book_snapshot order_book_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.order_book_snapshot
    ADD CONSTRAINT order_book_snapshot_pkey PRIMARY KEY (symbol, "timestamp", level);


--
-- Name: portfolio_holdings portfolio_holdings_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.portfolio_holdings
    ADD CONSTRAINT portfolio_holdings_pkey PRIMARY KEY (id);


--
-- Name: portfolio_holdings portfolio_holdings_portfolio_id_symbol_key; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.portfolio_holdings
    ADD CONSTRAINT portfolio_holdings_portfolio_id_symbol_key UNIQUE (portfolio_id, symbol);


--
-- Name: portfolios portfolios_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_pkey PRIMARY KEY (id);


--
-- Name: portfolios portfolios_user_id_key; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_user_id_key UNIQUE (user_id);


--
-- Name: sector_classification sector_classification_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.sector_classification
    ADD CONSTRAINT sector_classification_pkey PRIMARY KEY (symbol);


--
-- Name: sector_performance sector_performance_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.sector_performance
    ADD CONSTRAINT sector_performance_pkey PRIMARY KEY (sector_name, date);


--
-- Name: technical_levels technical_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.technical_levels
    ADD CONSTRAINT technical_levels_pkey PRIMARY KEY (id);


--
-- Name: technical_levels technical_levels_symbol_calc_date_key; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.technical_levels
    ADD CONSTRAINT technical_levels_symbol_calc_date_key UNIQUE (symbol, calc_date);


--
-- Name: trade_history trade_history_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.trade_history
    ADD CONSTRAINT trade_history_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: volume_statistics volume_statistics_pkey; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.volume_statistics
    ADD CONSTRAINT volume_statistics_pkey PRIMARY KEY (id);


--
-- Name: volume_statistics volume_statistics_symbol_stat_date_key; Type: CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.volume_statistics
    ADD CONSTRAINT volume_statistics_symbol_stat_date_key UNIQUE (symbol, stat_date);


--
-- Name: idx_actions_symbol_date; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_actions_symbol_date ON public.corporate_actions USING btree (symbol, ex_date DESC);


--
-- Name: idx_analyst_symbol; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_analyst_symbol ON public.analyst_ratings USING btree (symbol, rating_date DESC);


--
-- Name: idx_corp_actions_symbol; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_corp_actions_symbol ON public.corporate_actions USING btree (symbol, ex_date DESC);


--
-- Name: idx_earnings_symbol; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_earnings_symbol ON public.earnings_calendar USING btree (symbol, announcement_date DESC);


--
-- Name: idx_financials_symbol; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_financials_symbol ON public.financial_statements USING btree (symbol, fiscal_year DESC);


--
-- Name: idx_holdings_portfolio; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_holdings_portfolio ON public.portfolio_holdings USING btree (portfolio_id);


--
-- Name: idx_index_history; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_index_history ON public.index_history USING btree (index_code, date DESC);


--
-- Name: idx_insider_symbol_date; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_insider_symbol_date ON public.insider_trading USING btree (symbol, transaction_date DESC);


--
-- Name: idx_intraday_symbol_time; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_intraday_symbol_time ON public.intraday_ohlc USING btree (symbol, "timestamp" DESC);


--
-- Name: idx_market_news_published; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_market_news_published ON public.market_news USING btree (published_at DESC);


--
-- Name: idx_market_news_symbol; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_market_news_symbol ON public.market_news USING btree (symbol);


--
-- Name: idx_market_tickers_sector; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_market_tickers_sector ON public.market_tickers USING btree (sector_name);


--
-- Name: idx_nav_fund_date; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_nav_fund_date ON public.nav_history USING btree (fund_id, date DESC);


--
-- Name: idx_news_symbol; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_news_symbol ON public.market_news USING btree (symbol, published_at DESC);


--
-- Name: idx_ohlc_history_symbol_time; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_ohlc_history_symbol_time ON public.ohlc_history USING btree (symbol, "time" DESC);


--
-- Name: idx_ohlc_symbol; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_ohlc_symbol ON public.ohlc_history USING btree (symbol, "time" DESC);


--
-- Name: idx_ohlc_symbol_date; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_ohlc_symbol_date ON public.ohlc_data USING btree (symbol, date DESC);


--
-- Name: idx_orderbook_symbol_time; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_orderbook_symbol_time ON public.order_book_snapshot USING btree (symbol, "timestamp" DESC);


--
-- Name: idx_ratios_ext_symbol; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_ratios_ext_symbol ON public.financial_ratios_extended USING btree (symbol, fiscal_year DESC);


--
-- Name: idx_ratios_symbol; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_ratios_symbol ON public.financial_ratios USING btree (symbol, fiscal_year DESC);


--
-- Name: idx_shareholders_symbol; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_shareholders_symbol ON public.major_shareholders USING btree (symbol, ownership_percent DESC);


--
-- Name: idx_technicals_symbol; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_technicals_symbol ON public.technical_levels USING btree (symbol, calc_date DESC);


--
-- Name: idx_tickers_updated; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_tickers_updated ON public.market_tickers USING btree (last_updated DESC);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_volume_symbol; Type: INDEX; Schema: public; Owner: home
--

CREATE INDEX idx_volume_symbol ON public.volume_statistics USING btree (symbol, stat_date DESC);


--
-- Name: api_keys api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: company_profiles company_profiles_symbol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.company_profiles
    ADD CONSTRAINT company_profiles_symbol_fkey FOREIGN KEY (symbol) REFERENCES public.market_tickers(symbol);


--
-- Name: earnings_calendar earnings_calendar_symbol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.earnings_calendar
    ADD CONSTRAINT earnings_calendar_symbol_fkey FOREIGN KEY (symbol) REFERENCES public.market_tickers(symbol);


--
-- Name: fair_values fair_values_symbol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.fair_values
    ADD CONSTRAINT fair_values_symbol_fkey FOREIGN KEY (symbol) REFERENCES public.market_tickers(symbol);


--
-- Name: financial_ratios_extended financial_ratios_extended_symbol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.financial_ratios_extended
    ADD CONSTRAINT financial_ratios_extended_symbol_fkey FOREIGN KEY (symbol) REFERENCES public.market_tickers(symbol);


--
-- Name: financial_ratios financial_ratios_symbol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.financial_ratios
    ADD CONSTRAINT financial_ratios_symbol_fkey FOREIGN KEY (symbol) REFERENCES public.market_tickers(symbol);


--
-- Name: financial_statements financial_statements_symbol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.financial_statements
    ADD CONSTRAINT financial_statements_symbol_fkey FOREIGN KEY (symbol) REFERENCES public.market_tickers(symbol);


--
-- Name: ipo_history ipo_history_symbol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.ipo_history
    ADD CONSTRAINT ipo_history_symbol_fkey FOREIGN KEY (symbol) REFERENCES public.market_tickers(symbol);


--
-- Name: major_shareholders major_shareholders_symbol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.major_shareholders
    ADD CONSTRAINT major_shareholders_symbol_fkey FOREIGN KEY (symbol) REFERENCES public.market_tickers(symbol);


--
-- Name: market_news market_news_symbol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.market_news
    ADD CONSTRAINT market_news_symbol_fkey FOREIGN KEY (symbol) REFERENCES public.market_tickers(symbol);


--
-- Name: nav_history nav_history_fund_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.nav_history
    ADD CONSTRAINT nav_history_fund_id_fkey FOREIGN KEY (fund_id) REFERENCES public.mutual_funds(fund_id);


--
-- Name: ohlc_history ohlc_history_symbol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.ohlc_history
    ADD CONSTRAINT ohlc_history_symbol_fkey FOREIGN KEY (symbol) REFERENCES public.market_tickers(symbol);


--
-- Name: portfolio_holdings portfolio_holdings_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.portfolio_holdings
    ADD CONSTRAINT portfolio_holdings_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id);


--
-- Name: portfolio_holdings portfolio_holdings_symbol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.portfolio_holdings
    ADD CONSTRAINT portfolio_holdings_symbol_fkey FOREIGN KEY (symbol) REFERENCES public.market_tickers(symbol);


--
-- Name: sector_classification sector_classification_symbol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.sector_classification
    ADD CONSTRAINT sector_classification_symbol_fkey FOREIGN KEY (symbol) REFERENCES public.market_tickers(symbol);


--
-- Name: technical_levels technical_levels_symbol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.technical_levels
    ADD CONSTRAINT technical_levels_symbol_fkey FOREIGN KEY (symbol) REFERENCES public.market_tickers(symbol);


--
-- Name: trade_history trade_history_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.trade_history
    ADD CONSTRAINT trade_history_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id);


--
-- Name: volume_statistics volume_statistics_symbol_fkey; Type: FK CONSTRAINT; Schema: public; Owner: home
--

ALTER TABLE ONLY public.volume_statistics
    ADD CONSTRAINT volume_statistics_symbol_fkey FOREIGN KEY (symbol) REFERENCES public.market_tickers(symbol);


--
-- PostgreSQL database dump complete
--

\unrestrict dd2Rt2JqYB9HbehZq5ro9oyaUD4tV9KspYFf9Z9AF2d9szqKyy0rNfgSu6Wtchv

