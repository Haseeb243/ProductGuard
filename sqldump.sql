--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-09-23 22:03:48

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
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
-- TOC entry 227 (class 1259 OID 16430)
-- Name: activity_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_log (
    id integer NOT NULL,
    username character varying(50),
    action character varying(50),
    target character varying(50),
    details text,
    log_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    metadata jsonb
);


ALTER TABLE public.activity_log OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16429)
-- Name: activity_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_log_id_seq OWNER TO postgres;

--
-- TOC entry 5008 (class 0 OID 0)
-- Dependencies: 226
-- Name: activity_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_log_id_seq OWNED BY public.activity_log.id;


--
-- TOC entry 218 (class 1259 OID 16388)
-- Name: auth; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth (
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    id integer NOT NULL,
    role character varying(50) NOT NULL,
    email character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    last_login timestamp with time zone,
    is_2fa_enabled boolean DEFAULT false,
    two_factor_secret character varying(64)
);


ALTER TABLE public.auth OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 16387)
-- Name: auth_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.auth_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.auth_id_seq OWNER TO postgres;

--
-- TOC entry 5009 (class 0 OID 0)
-- Dependencies: 217
-- Name: auth_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.auth_id_seq OWNED BY public.auth.id;


--
-- TOC entry 237 (class 1259 OID 24735)
-- Name: chain_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chain_events (
    id integer NOT NULL,
    serial_number text,
    event_name text NOT NULL,
    tx_hash text NOT NULL,
    payload jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.chain_events OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 24734)
-- Name: chain_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chain_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chain_events_id_seq OWNER TO postgres;

--
-- TOC entry 5010 (class 0 OID 0)
-- Dependencies: 236
-- Name: chain_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chain_events_id_seq OWNED BY public.chain_events.id;


--
-- TOC entry 229 (class 1259 OID 24681)
-- Name: inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory (
    id integer NOT NULL,
    serial_number character varying(50) NOT NULL,
    owner_role character varying(50) NOT NULL,
    owner_username character varying(50),
    status character varying(30) DEFAULT 'in_stock'::character varying NOT NULL,
    qty integer DEFAULT 1 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 24680)
-- Name: inventory_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_id_seq OWNER TO postgres;

--
-- TOC entry 5011 (class 0 OID 0)
-- Dependencies: 228
-- Name: inventory_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_id_seq OWNED BY public.inventory.id;


--
-- TOC entry 231 (class 1259 OID 24698)
-- Name: inventory_moves; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_moves (
    id integer NOT NULL,
    serial_number character varying(50) NOT NULL,
    from_owner_role character varying(50),
    from_owner_username character varying(50),
    to_owner_role character varying(50),
    to_owner_username character varying(50),
    qty integer DEFAULT 1 NOT NULL,
    status character varying(30) NOT NULL,
    moved_at timestamp with time zone DEFAULT now() NOT NULL,
    actor_username character varying(50)
);


ALTER TABLE public.inventory_moves OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 24697)
-- Name: inventory_moves_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_moves_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_moves_id_seq OWNER TO postgres;

--
-- TOC entry 5012 (class 0 OID 0)
-- Dependencies: 230
-- Name: inventory_moves_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_moves_id_seq OWNED BY public.inventory_moves.id;


--
-- TOC entry 223 (class 1259 OID 16414)
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.login_attempts (
    id integer NOT NULL,
    username character varying(50),
    attempt_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    success boolean,
    ip_address character varying(64),
    user_agent character varying(255)
);


ALTER TABLE public.login_attempts OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16413)
-- Name: login_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.login_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.login_attempts_id_seq OWNER TO postgres;

--
-- TOC entry 5013 (class 0 OID 0)
-- Dependencies: 222
-- Name: login_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.login_attempts_id_seq OWNED BY public.login_attempts.id;


--
-- TOC entry 235 (class 1259 OID 24724)
-- Name: notification_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_log (
    id integer NOT NULL,
    type character varying(30) NOT NULL,
    recipient character varying(255) NOT NULL,
    subject character varying(255),
    body text,
    status character varying(30) DEFAULT 'queued'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    sent_at timestamp with time zone,
    error text
);


ALTER TABLE public.notification_log OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 24723)
-- Name: notification_log_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_log_id_seq OWNER TO postgres;

--
-- TOC entry 5014 (class 0 OID 0)
-- Dependencies: 234
-- Name: notification_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_log_id_seq OWNED BY public.notification_log.id;


--
-- TOC entry 221 (class 1259 OID 16408)
-- Name: product; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product (
    name character varying(50),
    serialnumber character varying(50) NOT NULL,
    brand character varying(50),
    description text,
    image character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone
);


ALTER TABLE public.product OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 16422)
-- Name: product_scans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.product_scans (
    id integer NOT NULL,
    serial_number character varying(50),
    username character varying(50),
    scan_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    location character varying(255),
    is_authentic boolean DEFAULT false,
    is_suspicious boolean DEFAULT false,
    suspicion_reason text,
    user_agent character varying(255),
    geo_country character varying(64),
    geo_city character varying(64),
    ip_address character varying(64)
);


ALTER TABLE public.product_scans OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16421)
-- Name: product_scans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.product_scans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.product_scans_id_seq OWNER TO postgres;

--
-- TOC entry 5015 (class 0 OID 0)
-- Dependencies: 224
-- Name: product_scans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.product_scans_id_seq OWNED BY public.product_scans.id;


--
-- TOC entry 220 (class 1259 OID 16397)
-- Name: profile; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.profile (
    name character varying(50),
    description character varying(500),
    username character varying(50) NOT NULL,
    website character varying,
    location character varying(50),
    image character varying(50),
    role character varying(50),
    id integer NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.profile OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 16396)
-- Name: profile_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.profile_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.profile_id_seq OWNER TO postgres;

--
-- TOC entry 5016 (class 0 OID 0)
-- Dependencies: 219
-- Name: profile_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.profile_id_seq OWNED BY public.profile.id;


--
-- TOC entry 233 (class 1259 OID 24713)
-- Name: support_chats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.support_chats (
    id integer NOT NULL,
    username character varying(50),
    role character varying(50),
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.support_chats OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 24712)
-- Name: support_chats_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.support_chats_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.support_chats_id_seq OWNER TO postgres;

--
-- TOC entry 5017 (class 0 OID 0)
-- Dependencies: 232
-- Name: support_chats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.support_chats_id_seq OWNED BY public.support_chats.id;


--
-- TOC entry 4803 (class 2604 OID 16433)
-- Name: activity_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log ALTER COLUMN id SET DEFAULT nextval('public.activity_log_id_seq'::regclass);


--
-- TOC entry 4791 (class 2604 OID 16391)
-- Name: auth id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth ALTER COLUMN id SET DEFAULT nextval('public.auth_id_seq'::regclass);


--
-- TOC entry 4817 (class 2604 OID 24738)
-- Name: chain_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chain_events ALTER COLUMN id SET DEFAULT nextval('public.chain_events_id_seq'::regclass);


--
-- TOC entry 4805 (class 2604 OID 24684)
-- Name: inventory id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory ALTER COLUMN id SET DEFAULT nextval('public.inventory_id_seq'::regclass);


--
-- TOC entry 4809 (class 2604 OID 24701)
-- Name: inventory_moves id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_moves ALTER COLUMN id SET DEFAULT nextval('public.inventory_moves_id_seq'::regclass);


--
-- TOC entry 4797 (class 2604 OID 16417)
-- Name: login_attempts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_attempts ALTER COLUMN id SET DEFAULT nextval('public.login_attempts_id_seq'::regclass);


--
-- TOC entry 4814 (class 2604 OID 24727)
-- Name: notification_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_log ALTER COLUMN id SET DEFAULT nextval('public.notification_log_id_seq'::regclass);


--
-- TOC entry 4799 (class 2604 OID 16425)
-- Name: product_scans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_scans ALTER COLUMN id SET DEFAULT nextval('public.product_scans_id_seq'::regclass);


--
-- TOC entry 4794 (class 2604 OID 16400)
-- Name: profile id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile ALTER COLUMN id SET DEFAULT nextval('public.profile_id_seq'::regclass);


--
-- TOC entry 4812 (class 2604 OID 24716)
-- Name: support_chats id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_chats ALTER COLUMN id SET DEFAULT nextval('public.support_chats_id_seq'::regclass);


--
-- TOC entry 4837 (class 2606 OID 16438)
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- TOC entry 4821 (class 2606 OID 16393)
-- Name: auth auth_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth
    ADD CONSTRAINT auth_pkey PRIMARY KEY (id, username);


--
-- TOC entry 4852 (class 2606 OID 24743)
-- Name: chain_events chain_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chain_events
    ADD CONSTRAINT chain_events_pkey PRIMARY KEY (id);


--
-- TOC entry 4845 (class 2606 OID 24705)
-- Name: inventory_moves inventory_moves_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_moves
    ADD CONSTRAINT inventory_moves_pkey PRIMARY KEY (id);


--
-- TOC entry 4842 (class 2606 OID 24689)
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- TOC entry 4831 (class 2606 OID 16420)
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- TOC entry 4850 (class 2606 OID 24733)
-- Name: notification_log notification_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_log
    ADD CONSTRAINT notification_log_pkey PRIMARY KEY (id);


--
-- TOC entry 4828 (class 2606 OID 16412)
-- Name: product product_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_pkey PRIMARY KEY (serialnumber);


--
-- TOC entry 4835 (class 2606 OID 16428)
-- Name: product_scans product_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_scans
    ADD CONSTRAINT product_scans_pkey PRIMARY KEY (id);


--
-- TOC entry 4825 (class 2606 OID 16404)
-- Name: profile profile_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile
    ADD CONSTRAINT profile_pkey PRIMARY KEY (id);


--
-- TOC entry 4848 (class 2606 OID 24721)
-- Name: support_chats support_chats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_chats
    ADD CONSTRAINT support_chats_pkey PRIMARY KEY (id);


--
-- TOC entry 4819 (class 1259 OID 24666)
-- Name: auth_email_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX auth_email_unique ON public.auth USING btree (email) WHERE (email IS NOT NULL);


--
-- TOC entry 4838 (class 1259 OID 24679)
-- Name: idx_activity_log_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_log_time ON public.activity_log USING btree (log_time DESC);


--
-- TOC entry 4853 (class 1259 OID 24746)
-- Name: idx_chain_events_event_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chain_events_event_time ON public.chain_events USING btree (event_name, created_at DESC);


--
-- TOC entry 4854 (class 1259 OID 24745)
-- Name: idx_chain_events_serial_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chain_events_serial_time ON public.chain_events USING btree (serial_number, created_at DESC);


--
-- TOC entry 4855 (class 1259 OID 24744)
-- Name: idx_chain_events_tx_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_chain_events_tx_hash ON public.chain_events USING btree (tx_hash);


--
-- TOC entry 4843 (class 1259 OID 24711)
-- Name: idx_inventory_moves_serial_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_moves_serial_time ON public.inventory_moves USING btree (serial_number, moved_at DESC);


--
-- TOC entry 4839 (class 1259 OID 24696)
-- Name: idx_inventory_owner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_owner ON public.inventory USING btree (owner_role, owner_username);


--
-- TOC entry 4840 (class 1259 OID 24695)
-- Name: idx_inventory_serial; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_serial ON public.inventory USING btree (serial_number);


--
-- TOC entry 4829 (class 1259 OID 24678)
-- Name: idx_login_attempts_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_attempts_time ON public.login_attempts USING btree (attempt_time DESC);


--
-- TOC entry 4823 (class 1259 OID 24669)
-- Name: idx_profile_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profile_role ON public.profile USING btree (role);


--
-- TOC entry 4832 (class 1259 OID 24677)
-- Name: idx_scans_ip_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scans_ip_time ON public.product_scans USING btree (ip_address, scan_time DESC);


--
-- TOC entry 4833 (class 1259 OID 24676)
-- Name: idx_scans_serial_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scans_serial_time ON public.product_scans USING btree (serial_number, scan_time DESC);


--
-- TOC entry 4846 (class 1259 OID 24722)
-- Name: idx_support_chats_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_chats_time ON public.support_chats USING btree (created_at DESC);


--
-- TOC entry 4826 (class 1259 OID 24667)
-- Name: profile_username_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX profile_username_unique ON public.profile USING btree (username);


--
-- TOC entry 4822 (class 1259 OID 16395)
-- Name: username_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX username_id ON public.auth USING btree (username);


--
-- TOC entry 4857 (class 2606 OID 24706)
-- Name: inventory_moves inventory_moves_serial_number_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_moves
    ADD CONSTRAINT inventory_moves_serial_number_fkey FOREIGN KEY (serial_number) REFERENCES public.product(serialnumber) ON DELETE CASCADE;


--
-- TOC entry 4856 (class 2606 OID 24690)
-- Name: inventory inventory_serial_number_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_serial_number_fkey FOREIGN KEY (serial_number) REFERENCES public.product(serialnumber) ON DELETE CASCADE;


-- Completed on 2025-09-23 22:03:48

--
-- PostgreSQL database dump complete
--

