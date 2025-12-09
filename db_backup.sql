--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2025-10-04 03:58:54

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
-- TOC entry 5067 (class 0 OID 0)
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
-- TOC entry 5068 (class 0 OID 0)
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
    created_at timestamp with time zone DEFAULT now(),
    block_number bigint,
    log_index integer DEFAULT '-1'::integer,
    event_signature text,
    emitted_at timestamp with time zone
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
-- TOC entry 5069 (class 0 OID 0)
-- Dependencies: 236
-- Name: chain_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chain_events_id_seq OWNED BY public.chain_events.id;


--
-- TOC entry 241 (class 1259 OID 32905)
-- Name: consumer_ownership; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.consumer_ownership (
    id integer NOT NULL,
    serial_number character varying(50) NOT NULL,
    owner_name character varying(100) NOT NULL,
    acquired_at timestamp with time zone DEFAULT now(),
    transferred_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    owner_identifier character varying(128)
);


ALTER TABLE public.consumer_ownership OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 32904)
-- Name: consumer_ownership_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.consumer_ownership_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.consumer_ownership_id_seq OWNER TO postgres;

--
-- TOC entry 5070 (class 0 OID 0)
-- Dependencies: 240
-- Name: consumer_ownership_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.consumer_ownership_id_seq OWNED BY public.consumer_ownership.id;


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
-- TOC entry 5071 (class 0 OID 0)
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
-- TOC entry 5072 (class 0 OID 0)
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
-- TOC entry 5073 (class 0 OID 0)
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
-- TOC entry 5074 (class 0 OID 0)
-- Dependencies: 234
-- Name: notification_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_log_id_seq OWNED BY public.notification_log.id;


--
-- TOC entry 239 (class 1259 OID 32855)
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    token text NOT NULL,
    email character varying(255) NOT NULL,
    username character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    user_id integer,
    used boolean DEFAULT false
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 32854)
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_tokens_id_seq OWNER TO postgres;

--
-- TOC entry 5075 (class 0 OID 0)
-- Dependencies: 238
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


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
-- TOC entry 5076 (class 0 OID 0)
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
-- TOC entry 5077 (class 0 OID 0)
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    conversation_key text
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
-- TOC entry 5078 (class 0 OID 0)
-- Dependencies: 232
-- Name: support_chats_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.support_chats_id_seq OWNED BY public.support_chats.id;


--
-- TOC entry 4813 (class 2604 OID 16433)
-- Name: activity_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log ALTER COLUMN id SET DEFAULT nextval('public.activity_log_id_seq'::regclass);


--
-- TOC entry 4801 (class 2604 OID 16391)
-- Name: auth id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth ALTER COLUMN id SET DEFAULT nextval('public.auth_id_seq'::regclass);


--
-- TOC entry 4827 (class 2604 OID 24738)
-- Name: chain_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chain_events ALTER COLUMN id SET DEFAULT nextval('public.chain_events_id_seq'::regclass);


--
-- TOC entry 4833 (class 2604 OID 32908)
-- Name: consumer_ownership id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consumer_ownership ALTER COLUMN id SET DEFAULT nextval('public.consumer_ownership_id_seq'::regclass);


--
-- TOC entry 4815 (class 2604 OID 24684)
-- Name: inventory id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory ALTER COLUMN id SET DEFAULT nextval('public.inventory_id_seq'::regclass);


--
-- TOC entry 4819 (class 2604 OID 24701)
-- Name: inventory_moves id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_moves ALTER COLUMN id SET DEFAULT nextval('public.inventory_moves_id_seq'::regclass);


--
-- TOC entry 4807 (class 2604 OID 16417)
-- Name: login_attempts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_attempts ALTER COLUMN id SET DEFAULT nextval('public.login_attempts_id_seq'::regclass);


--
-- TOC entry 4824 (class 2604 OID 24727)
-- Name: notification_log id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_log ALTER COLUMN id SET DEFAULT nextval('public.notification_log_id_seq'::regclass);


--
-- TOC entry 4830 (class 2604 OID 32858)
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- TOC entry 4809 (class 2604 OID 16425)
-- Name: product_scans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_scans ALTER COLUMN id SET DEFAULT nextval('public.product_scans_id_seq'::regclass);


--
-- TOC entry 4804 (class 2604 OID 16400)
-- Name: profile id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile ALTER COLUMN id SET DEFAULT nextval('public.profile_id_seq'::regclass);


--
-- TOC entry 4822 (class 2604 OID 24716)
-- Name: support_chats id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_chats ALTER COLUMN id SET DEFAULT nextval('public.support_chats_id_seq'::regclass);


--
-- TOC entry 5047 (class 0 OID 16430)
-- Dependencies: 227
-- Data for Name: activity_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_log (id, username, action, target, details, log_time, metadata) FROM stdin;
53	admin	add_product	A111	Added product Easysmx x05 (Easysmx)	2025-05-25 00:17:46.763916	\N
54	admin	add_product	A112	Added product Easysmx x05 (Easysmx)	2025-05-25 01:59:24.169434	\N
55	admin	add_product	A3344	Added product Rolex 230 (Rolex)	2025-05-26 01:07:05.405695	\N
56	admin	add_product	A1121	Added product Easysmx x05 (Easysmx)	2025-05-26 07:39:52.691492	\N
57	admin	add_product	A212	Added product Easysmx x05 (Easysmx)	2025-05-26 07:45:10.912874	\N
58	admin	add_product	A2121	Added product Easysmx x05 (Easysmx)	2025-05-26 08:03:51.607393	\N
59	admin	add_product	A3211	Added product Easysmx x05 (Easysmx)	2025-05-26 08:19:55.891274	\N
60	admin	add_product	A3211	Added product Easysmx x05 (Easysmx)	2025-05-26 08:38:38.275394	\N
61	admin	add_product	a123	Added product birkin (harme)	2025-09-23 05:19:52.530462	\N
62	admin	add_product	a1231	Added product birkin (harme)	2025-09-24 01:40:00.055766	\N
63	admin	add_product	a1232	Added product birkin (harme)	2025-09-24 02:34:58.935902	\N
64	manu	add_product	a12321	Added product birkin (harme)	2025-09-24 02:38:40.811607	\N
65	retailer	login	auth	User logged in successfully	2025-09-28 01:32:33.85581	\N
66	retailer	login	auth	User logged in successfully	2025-09-28 01:34:14.446284	\N
67	supp	login	auth	User logged in successfully	2025-09-28 01:34:19.499056	\N
68	retailer	login	auth	User logged in successfully	2025-09-28 01:44:31.478854	\N
69	admin	login	auth	User logged in successfully	2025-09-28 01:53:28.145071	\N
70	admin	login	auth	User logged in successfully	2025-09-28 01:53:41.590825	\N
71	admin	login	auth	User logged in successfully	2025-09-28 01:58:19.078186	\N
72	manu	login	auth	User logged in successfully	2025-09-28 01:58:35.518891	\N
73	retailer	login	auth	User logged in successfully	2025-09-28 01:58:44.81479	\N
74	supp	login	auth	User logged in successfully	2025-09-28 01:58:56.045382	\N
75	admin	login	auth	User logged in successfully	2025-09-28 01:59:11.053259	\N
76	admin	login	auth	User logged in successfully	2025-09-28 02:00:48.753465	\N
77	admin	login	auth	User logged in successfully	2025-09-28 02:00:57.954951	\N
78	admin	login	auth	User logged in successfully	2025-09-28 02:01:29.933481	\N
79	supp	login	auth	User logged in successfully	2025-09-28 02:01:48.307674	\N
80	manu	login	auth	User logged in successfully	2025-09-28 02:02:00.916324	\N
81	admin	login	auth	User logged in successfully	2025-09-28 02:02:06.108773	\N
82	admin	login	auth	User logged in successfully	2025-09-28 02:03:37.950309	\N
83	admin	login	auth	User logged in successfully	2025-09-28 02:04:05.465413	\N
84	admin	login	auth	User logged in successfully	2025-09-28 02:04:30.037519	\N
85	admin	login	auth	User logged in successfully	2025-09-28 02:07:02.031194	\N
86	admin	login	auth	User logged in successfully	2025-09-28 02:08:03.505292	\N
87	admin	login	auth	User logged in successfully	2025-09-28 02:11:55.515808	\N
88	admin	login	auth	User logged in successfully	2025-09-28 02:16:50.038514	\N
89	admin	login	auth	User logged in successfully	2025-09-28 02:22:45.773868	\N
90	admin	login	auth	User logged in successfully	2025-09-28 02:23:46.58435	\N
91	admin	login	auth	User logged in successfully	2025-09-28 02:23:58.507743	\N
92	admin	login	auth	User logged in successfully	2025-09-28 02:24:12.645654	\N
93	admin	login	auth	User logged in successfully	2025-09-28 02:27:34.525438	\N
94	admin	login	auth	User logged in successfully	2025-09-28 02:28:10.900013	\N
95	manu	login	auth	User logged in successfully	2025-09-28 02:28:33.812856	\N
96	admin	login	auth	User logged in successfully	2025-09-28 02:37:06.225944	\N
97	admin	login	auth	User logged in successfully	2025-09-28 02:42:18.111022	\N
98	admin	login	auth	User logged in successfully	2025-09-28 02:42:25.84077	\N
99	manu	login	auth	User logged in successfully	2025-09-28 02:42:36.812497	\N
100	admin	login	auth	User logged in successfully	2025-09-28 02:43:06.347921	\N
101	manu	login	auth	User logged in successfully	2025-09-28 02:44:44.470526	\N
102	manu	login	auth	User logged in successfully	2025-09-28 02:45:02.732544	\N
103	admin	login	auth	User logged in successfully	2025-09-28 02:51:24.355512	\N
104	admin	login	auth	User logged in successfully	2025-09-28 03:15:51.604009	\N
105	admin	login	auth	User logged in successfully	2025-09-28 03:17:51.583777	\N
106	manu	login	auth	User logged in successfully	2025-09-28 03:19:26.270796	\N
107	manu	login	auth	User logged in successfully	2025-09-28 03:30:25.939412	\N
108	admin	login	auth	User logged in successfully	2025-09-28 03:31:03.404316	\N
109	admin	login	auth	User logged in successfully	2025-09-28 03:33:01.943916	\N
110	manu	login	auth	User logged in successfully	2025-09-28 03:33:48.698117	\N
111	admin	login	auth	User logged in successfully	2025-09-28 03:41:02.55619	\N
112	admin	login	auth	User logged in successfully	2025-09-28 03:46:04.738433	\N
113	admin	login	auth	User logged in successfully	2025-09-28 04:05:37.250966	\N
114	admin	login	auth	User logged in successfully	2025-09-28 04:06:05.22343	\N
115	supp	login	auth	User logged in successfully	2025-09-28 04:08:32.609691	\N
116	admin	login	auth	User logged in successfully	2025-09-28 04:09:21.171339	\N
117	admin	login	auth	User logged in successfully	2025-09-28 04:13:16.410644	\N
118	supp	login	auth	User logged in successfully	2025-09-28 04:14:30.177215	\N
119	admin	login	auth	User logged in successfully	2025-09-28 04:15:04.005878	\N
120	admin	create_account	pak	Created account with role manufacturer	2025-09-28 04:18:10.288815	\N
121	pak	login	auth	User logged in successfully	2025-09-28 04:18:45.5695	\N
122	admin	password_rehash	admin	Upgraded plaintext password to bcrypt hash	2025-09-28 23:58:37.47113	\N
123	retailer	password_rehash	retailer	Upgraded plaintext password to bcrypt hash	2025-09-29 00:00:25.527263	\N
124	supp	password_rehash	supp	Upgraded plaintext password to bcrypt hash	2025-09-29 00:01:32.993117	\N
125	manu	password_rehash	manu	Upgraded plaintext password to bcrypt hash	2025-09-29 00:01:47.463815	\N
126	manu	add_product	a123221	Added product birkin (harme)	2025-09-29 00:15:33.720299	\N
127	manu	add_product	a123211	Added product birkin (harme)	2025-09-29 01:44:34.281006	\N
128	admin	password_reset	1	Password reset via email link	2025-09-29 02:28:10.02606	\N
129	admin	password_reset	1	Password reset via email link	2025-09-29 02:46:18.032433	\N
130	manu	password_reset	54	Password reset via email link	2025-09-29 02:49:51.148685	\N
131	manu	add_product	a1232111	Added product birkin (harme)	2025-09-29 20:35:32.682186	\N
132	anonymous	product_verification_scan	a1232111	Verification scan - Authentic: false, Suspicious: true	2025-09-29 20:52:05.553646	\N
133	anonymous	product_verification_scan	a1232111	Verification scan - Authentic: false, Suspicious: true	2025-09-29 20:52:28.332064	\N
134	manu	add_product	a12	Added product birkin (harme)	2025-09-29 20:56:21.037008	\N
135	manu	add_product	a1212	Added product birkin (harme)	2025-09-29 21:10:44.290405	\N
136	manu	add_product	a111	Added product birkin (harme)	2025-09-29 21:11:22.583047	\N
137	manu	add_product	1213	Added product birkin (harme)	2025-09-29 21:12:06.75119	\N
138	manu	add_product	a1322	Added product Easysmx x05 (Easysmx)	2025-09-29 21:15:32.203952	\N
139	manu	add_product	a121	Added product Easysmx x05 (Easysmx)	2025-09-29 21:18:02.163927	\N
140	manu	add_product	a132	Added product Easysmx x05 (Easysmx)	2025-09-30 04:16:26.603324	\N
141	supp	product_verification_scan	a132	Verification scan - Authentic: true, Suspicious: false	2025-09-30 04:30:45.608846	\N
142	retailer	product_verification_scan	a132	Verification scan - Authentic: true, Suspicious: false	2025-09-30 04:38:17.047008	\N
143	retailer	product_verification_scan	a132	Verification scan - Authentic: true, Suspicious: false	2025-09-30 04:40:31.524724	\N
144	retailer	product_verification_scan	a132	Verification scan - Authentic: true, Suspicious: false	2025-09-30 04:51:29.326656	\N
145	admin	product_verification_scan	a132	Verification scan - Authentic: true, Suspicious: false	2025-09-30 05:01:20.584728	\N
146	admin	product_verification_scan	a132	Verification scan - Authentic: true, Suspicious: false	2025-09-30 05:02:35.98834	\N
147	admin	product_verification_scan	a132	Verification scan - Authentic: true, Suspicious: false	2025-09-30 05:03:32.324573	\N
148	retailer	product_verification_scan	a132	Verification scan - Authentic: true, Suspicious: false	2025-09-30 05:04:40.884986	\N
149	manu	add_product	a131	Added product Easysmx x05 (Easysmx)	2025-09-30 05:20:39.532754	\N
150	supp	product_verification_scan	a132	Verification scan - Authentic: true, Suspicious: false	2025-09-30 05:22:14.47259	\N
151	manu	add_product	a23	Added product Easysmx x05 (Easysmx)	2025-09-30 05:23:25.885909	\N
152	manu	add_product	a32	Added product Easysmx x05 (Easysmx)	2025-09-30 05:38:27.418927	\N
153	manu	add_product	a22	Added product Easysmx x05 (Easysmx)	2025-09-30 05:41:10.383617	\N
154	supp	product_verification_scan	a22	Verification scan - Authentic: true, Suspicious: false	2025-09-30 05:42:17.199192	\N
155	manu	add_product	a112	Added product Easysmx x05 (Easysmx)	2025-09-30 05:56:23.56499	\N
156	supp	product_verification_scan	a112	Verification scan - Authentic: true, Suspicious: false	2025-09-30 05:58:01.111146	\N
157	retailer	product_verification_scan	a112	Verification scan - Authentic: true, Suspicious: false	2025-09-30 05:58:57.130034	\N
158	retailer	product_verification_scan	a112	Verification scan - Authentic: true, Suspicious: false	2025-09-30 06:00:06.507356	\N
159	manu	add_product	a35	Added product Easysmx x05 (Easysmx)	2025-09-30 06:03:16.399451	\N
160	supp	product_verification_scan	a35	Verification scan - Authentic: true, Suspicious: false	2025-09-30 06:05:47.687219	\N
161	retailer	product_verification_scan	a35	Verification scan - Authentic: true, Suspicious: false	2025-09-30 06:12:34.814611	\N
162	retailer	product_verification_scan	a35	Verification scan - Authentic: true, Suspicious: false	2025-09-30 06:16:32.239457	\N
163	retailer	product_verification_scan	a112	Verification scan - Authentic: true, Suspicious: false	2025-09-30 06:22:18.815448	\N
164	retailer	ownership_transfer	a112	Ownership set to aizaz (7979)	2025-09-30 06:22:53.319247	\N
165	retailer	product_verification_scan	a112	Verification scan - Authentic: true, Suspicious: false	2025-09-30 06:23:34.033329	\N
166	admin	product_verification_scan	a112	Verification scan - Authentic: true, Suspicious: false	2025-09-30 06:24:14.14745	\N
167	manu	add_product	a232	Added product Easysmx x05 (Easysmx)	2025-10-01 02:44:32.168254	\N
168	supp	product_verification_scan	a232	Verification scan - Authentic: true, Suspicious: false	2025-10-01 02:45:12.774588	\N
169	manu	add_product	a322	Added product Easysmx x05 (Easysmx)	2025-10-01 02:47:44.811056	\N
170	manu	add_product	a1211	Added product Easysmx x05 (Easysmx)	2025-10-01 02:59:02.330821	\N
171	supp	product_verification_scan	a1211	Verification scan - Authentic: true, Suspicious: false	2025-10-01 02:59:55.706922	\N
172	manu	add_product	a323	Added product Easysmx x05 (Easysmx)	2025-10-01 03:05:29.329718	\N
173	manu	add_product	a212	Added product Easysmx x05 (Easysmx)	2025-10-01 03:11:57.592115	\N
174	manu	add_product	a243	Added product Easysmx x05 (Easysmx)	2025-10-01 03:52:31.39429	\N
175	supp	product_verification_scan	a243	Verification scan - Authentic: true, Suspicious: false	2025-10-01 03:53:46.455396	\N
176	retailer	product_verification_scan	a243	Verification scan - Authentic: true, Suspicious: false	2025-10-01 03:57:43.276196	\N
177	retailer	ownership_transfer	a243	Ownership set to Pakistan (09877)	2025-10-01 03:59:13.445645	\N
178	admin	product_verification_scan	a243	Verification scan - Authentic: true, Suspicious: false	2025-10-01 04:04:35.434634	\N
179	manu	add_product	a2321	Added product Easysmx x05 (Easysmx)	2025-10-01 04:48:21.699927	\N
180	supp	product_verification_scan	a2321	Verification scan - Authentic: true, Suspicious: false	2025-10-01 04:49:01.658126	\N
181	manu	product_verification_scan	a2321	Verification scan - Authentic: true, Suspicious: false	2025-10-01 15:34:06.672249	\N
182	manu	product_verification_scan	a243	Verification scan - Authentic: true, Suspicious: false	2025-10-01 15:34:41.140976	\N
183	manu	add_product	pa11	Added product Easysmx x05 (Easysmx)	2025-10-02 22:04:14.289484	\N
184	admin	add_account	manufacturer_test	Added account with role manufacturer	2025-10-03 01:37:46.486157	\N
185	manu	add_product	pa111	Added product easysmx (Easysmx)	2025-10-03 01:43:23.551505	\N
186	supp	product_verification_scan	pa11	Verification scan - Authentic: true, Suspicious: false	2025-10-03 01:46:30.799932	\N
187	retailer	product_verification_scan	pa11	Verification scan - Authentic: true, Suspicious: false	2025-10-03 01:47:48.321181	\N
188	retailer	ownership_transfer	pa11	Ownership set to aizaz (0909)	2025-10-03 01:48:43.714844	\N
189	manu	add_product	pa12	Added product easysmx (Easysmx)	2025-10-03 01:57:24.304356	\N
190	supp	product_verification_scan	pa12	Verification scan - Authentic: true, Suspicious: false	2025-10-03 01:59:24.405446	\N
191	retailer	product_verification_scan	pa12	Verification scan - Authentic: true, Suspicious: false	2025-10-03 02:10:38.568512	\N
192	retailer	ownership_transfer	pa12	Ownership set to haseeb (sadfh)	2025-10-03 02:10:56.115203	\N
193	manu	add_product	pg-12	Added product easysmx (Easysmx)	2025-10-03 02:12:49.619238	\N
194	supp	product_verification_scan	pg-12	Verification scan - Authentic: true, Suspicious: false	2025-10-03 02:18:37.348243	\N
195	supp	product_verification_scan	pa12	Verification scan - Authentic: true, Suspicious: false	2025-10-04 02:41:04.750492	\N
196	supp	product_verification_scan	pa12	Verification scan - Authentic: true, Suspicious: false	2025-10-04 02:52:27.047038	\N
197	manu	add_product	pg12	Added product easysmx (Easysmx)	2025-10-04 02:53:52.886772	\N
198	supp	product_verification_scan	pg12	Verification scan - Authentic: true, Suspicious: false	2025-10-04 02:54:32.466777	\N
199	supp	product_verification_scan	pg12	Verification scan - Authentic: true, Suspicious: false	2025-10-04 02:56:26.278721	\N
200	supp	product_verification_scan	pg12	Verification scan - Authentic: true, Suspicious: false	2025-10-04 02:57:29.250259	\N
201	supp	product_verification_scan	pg12	Verification scan - Authentic: true, Suspicious: false	2025-10-04 03:07:10.23059	\N
202	supp	product_verification_scan	a123221	Verification scan - Authentic: true, Suspicious: false	2025-10-04 03:07:58.024845	\N
203	supp	product_verification_scan	pg12	Verification scan - Authentic: true, Suspicious: false	2025-10-04 03:10:03.769905	\N
204	retailer	product_verification_scan	pg12	Verification scan - Authentic: true, Suspicious: false	2025-10-04 03:14:09.964928	\N
205	retailer	product_verification_scan	pg12	Verification scan - Authentic: true, Suspicious: false	2025-10-04 03:14:52.302469	\N
206	supp	product_verification_scan	pg12	Verification scan - Authentic: true, Suspicious: false	2025-10-04 03:15:26.068584	\N
207	retailer	product_verification_scan	pg12	Verification scan - Authentic: true, Suspicious: false	2025-10-04 03:23:07.924911	\N
208	retailer	ownership_transfer	pg12	Ownership set to Azzy (03458384)	2025-10-04 03:23:56.27391	\N
209	supp	product_verification_scan	pg12	Verification scan - Authentic: true, Suspicious: false	2025-10-04 03:49:22.369919	\N
\.


--
-- TOC entry 5038 (class 0 OID 16388)
-- Dependencies: 218
-- Data for Name: auth; Type: TABLE DATA; Schema: public; Owner: postgres
--
-- SECURITY NOTE: Password hashes below are PLACEHOLDERS (XXXXXXXXXXX...).
-- You must create real user accounts with secure passwords after importing this dump.
-- Use bcrypt to hash passwords. See README.md for setup instructions.
--

COPY public.auth (username, password, id, role, email, created_at, last_login, is_2fa_enabled, two_factor_secret) FROM stdin;
admin	$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX	1	admin	admin@example.com	2025-09-23 22:01:49.390002+05	2025-10-04 03:50:59.058581+05	f	\N
supplier	$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX	3	supplier	supplier@example.com	2025-09-23 22:01:49.390002+05	2025-10-04 03:54:58.720626+05	f	\N
manufacturer	$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX	7	manufacturer	manufacturer@example.com	2025-09-28 04:18:10.284367+05	2025-09-28 04:18:45.564222+05	f	\N
manufacturer_test	$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX	8	manufacturer	manufacturer_test@example.com	2025-10-03 01:37:46.476035+05	\N	f	\N
retailer	$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX	56	retailer	retailer@example.com	2025-09-23 22:01:49.390002+05	2025-10-04 03:24:13.926603+05	f	\N
\.


--
-- TOC entry 5057 (class 0 OID 24735)
-- Dependencies: 237
-- Data for Name: chain_events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chain_events (id, serial_number, event_name, tx_hash, payload, created_at, block_number, log_index, event_signature, emitted_at) FROM stdin;
26	a323	ProductHistoryAdded	0xa2bff423e68bab98e86b912fa3cf8d04b86f24227c30e552c6eea1f878bce621	{"actor": "Manu Group", "isSold": false, "source": "on-chain", "location": "Islamabad; Pakistan", "timestamp": "1759269905", "serialHash": "0x7040dc9446e68176093b986ee79b5f537ce088641a34f69b1a6cb8f1516f2dc9", "serialNumber": "a323", "timestampUnix": 1759269905}	2025-10-01 03:40:35.279392+05	2	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-01 03:05:28+05
24	a323	ProductRegistered	0xa2bff423e68bab98e86b912fa3cf8d04b86f24227c30e552c6eea1f878bce621	{"name": "Easysmx x05", "actor": "Manu Group", "brand": "Easysmx", "isSold": false, "source": "on-chain", "location": "Islamabad; Pakistan", "timestamp": "1759269905", "serialHash": "0x7040dc9446e68176093b986ee79b5f537ce088641a34f69b1a6cb8f1516f2dc9", "serialNumber": "a323", "timestampUnix": 1759269905}	2025-10-01 03:40:35.22009+05	2	1	ProductRegistered(string,string,string,string,string,string)	2025-10-01 03:05:28+05
25	a212	ProductRegistered	0x734e5bd8e189eda71fa66f774a81a77fc2e8882af5bbf90e73e7c2ecdbfde6e6	{"name": "Easysmx x05", "actor": "Manu Group", "brand": "Easysmx", "isSold": false, "source": "on-chain", "location": "Islamabad; Pakistan", "timestamp": "1759270294", "serialHash": "0x9130bd8b14fc1f6646952d967c0ea4785603c1ca95c2e888407fe77b3e6cef9c", "serialNumber": "a212", "timestampUnix": 1759270294}	2025-10-01 03:40:35.247237+05	3	1	ProductRegistered(string,string,string,string,string,string)	2025-10-01 03:11:56+05
27	a212	ProductHistoryAdded	0x734e5bd8e189eda71fa66f774a81a77fc2e8882af5bbf90e73e7c2ecdbfde6e6	{"actor": "Manu Group", "isSold": false, "source": "on-chain", "location": "Islamabad; Pakistan", "timestamp": "1759270294", "serialHash": "0x9130bd8b14fc1f6646952d967c0ea4785603c1ca95c2e888407fe77b3e6cef9c", "serialNumber": "a212", "timestampUnix": 1759270294}	2025-10-01 03:40:35.295186+05	3	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-01 03:11:56+05
38	AUTO-1759272506513	ProductRegistered	0xbe2bdcdffaba5efa8170cc7bab189a275f7e9bb74c55746e44607a1be39a4322	{"name": "Auto Product", "actor": "QA Bot", "brand": "AutoBrand", "isSold": false, "source": "on-chain", "location": "Test City", "timestamp": "1759272506", "serialHash": "0xb13c13e43437514dd010a2d78760503914942798ae18b2bc0ea166256eb32b2c", "serialNumber": "AUTO-1759272506513", "timestampUnix": 1759272506}	2025-10-01 03:48:28.893426+05	2	1	ProductRegistered(string,string,string,string,string,string)	2025-10-01 03:48:25+05
39	AUTO-1759272506513	ProductHistoryAdded	0xbe2bdcdffaba5efa8170cc7bab189a275f7e9bb74c55746e44607a1be39a4322	{"actor": "QA Bot", "isSold": false, "source": "on-chain", "location": "Test City", "timestamp": "1759272506", "serialHash": "0xb13c13e43437514dd010a2d78760503914942798ae18b2bc0ea166256eb32b2c", "serialNumber": "AUTO-1759272506513", "timestampUnix": 1759272506}	2025-10-01 03:48:28.896282+05	2	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-01 03:48:25+05
40	a243	ProductRegistered	0x03fb647d6d5af80c00f9090563ae414aa10adc59dd06c1b20815710f7908319d	{"name": "Easysmx x05", "actor": "Manu Group", "brand": "Easysmx", "isSold": false, "source": "on-chain", "location": "Islamabad; Pakistan", "timestamp": "1759272732", "serialHash": "0xb0297d2fc9d901ab993175641d57a9515c1b7a0a3c25b65329b09bf4f4848fec", "serialNumber": "a243", "timestampUnix": 1759272732}	2025-10-01 03:52:33.41047+05	3	1	ProductRegistered(string,string,string,string,string,string)	2025-10-01 03:52:30+05
41	a243	ProductHistoryAdded	0x03fb647d6d5af80c00f9090563ae414aa10adc59dd06c1b20815710f7908319d	{"actor": "Manu Group", "isSold": false, "source": "on-chain", "location": "Islamabad; Pakistan", "timestamp": "1759272732", "serialHash": "0xb0297d2fc9d901ab993175641d57a9515c1b7a0a3c25b65329b09bf4f4848fec", "serialNumber": "a243", "timestampUnix": 1759272732}	2025-10-01 03:52:33.412088+05	3	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-01 03:52:30+05
42	a243	ProductHistoryAdded	0x4317e8efa2afcc29daf7c6cc6959c564a54f079e3599ac24f8b35192447d3597	{"actor": "CK Supplier", "isSold": false, "source": "on-chain", "location": "Islamabad; Pakistan", "timestamp": "1759272829", "serialHash": "0xb0297d2fc9d901ab993175641d57a9515c1b7a0a3c25b65329b09bf4f4848fec", "serialNumber": "a243", "timestampUnix": 1759272829}	2025-10-01 03:54:01.594724+05	4	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-01 03:53:57+05
43	a243	ProductHistoryAdded	0x3f4f253a496c7e893fbbfe0b56f171c1c0c183027059a83174f0595922ca4658	{"actor": "RE retailer", "isSold": false, "source": "on-chain", "location": "Islamabad; Pakistan", "timestamp": "1759273067", "serialHash": "0xb0297d2fc9d901ab993175641d57a9515c1b7a0a3c25b65329b09bf4f4848fec", "serialNumber": "a243", "timestampUnix": 1759273067}	2025-10-01 03:57:58.040865+05	5	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-01 03:57:55+05
44	a243	ProductHistoryAdded	0xda1a25bc4be818e2b5b062ab6e1d272b161e9d52fe3eb0e1294990ff123555a9	{"actor": "RE retailer", "isSold": true, "source": "on-chain", "location": "Islamabad; Pakistan", "timestamp": "1759273083", "serialHash": "0xb0297d2fc9d901ab993175641d57a9515c1b7a0a3c25b65329b09bf4f4848fec", "serialNumber": "a243", "timestampUnix": 1759273083}	2025-10-01 03:59:14.140844+05	6	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-01 03:59:12+05
46	a2321	ProductRegistered	0x51bf1e60ebdc8b6c315f3cc1069eebb73d2e78accf05dfede89756ccb13adb08	{"name": "Easysmx x05", "actor": "Manu Group", "brand": "Easysmx", "isSold": false, "source": "on-chain", "location": "Islamabad; Pakistan; Zone IV; PK-IS; Asia; Indian subcontinent; Asia/Karachi; Chak Shahzad", "timestamp": "1759276088", "serialHash": "0x7aaa4e5dc0b272e1ea3e264067f28dd554e16b32602ad2933ca762a30b6c9e49", "serialNumber": "a2321", "timestampUnix": 1759276088}	2025-10-01 04:48:22.229358+05	7	1	ProductRegistered(string,string,string,string,string,string)	2025-10-01 04:48:20+05
47	a2321	ProductHistoryAdded	0x51bf1e60ebdc8b6c315f3cc1069eebb73d2e78accf05dfede89756ccb13adb08	{"actor": "Manu Group", "isSold": false, "source": "on-chain", "location": "Islamabad; Pakistan; Zone IV; PK-IS; Asia; Indian subcontinent; Asia/Karachi; Chak Shahzad", "timestamp": "1759276088", "serialHash": "0x7aaa4e5dc0b272e1ea3e264067f28dd554e16b32602ad2933ca762a30b6c9e49", "serialNumber": "a2321", "timestampUnix": 1759276088}	2025-10-01 04:48:22.232005+05	7	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-01 04:48:20+05
50	pa11	ProductRegistered	0xeed8d612d314ea74b32402a794a588a83d603a4577d66466c9dbecf5a9e00497	{"name": "Easysmx x05", "actor": "Manu Group", "brand": "Easysmx", "isSold": false, "source": "on-chain", "location": "Islamabad; Pakistan; Zone IV; PK-IS; Asia; Indian subcontinent; Asia/Karachi; Chak Shahzad", "timestamp": "1759424629", "serialHash": "0xb2bf0bfec6feba62c64ad7ea94c4697867b74cae5922aa3e7994e7628f0a7d26", "serialNumber": "pa11", "timestampUnix": 1759424629}	2025-10-02 22:04:15.666097+05	8	1	ProductRegistered(string,string,string,string,string,string)	2025-10-02 22:04:13+05
51	pa11	ProductHistoryAdded	0xeed8d612d314ea74b32402a794a588a83d603a4577d66466c9dbecf5a9e00497	{"actor": "Manu Group", "isSold": false, "source": "on-chain", "location": "Islamabad; Pakistan; Zone IV; PK-IS; Asia; Indian subcontinent; Asia/Karachi; Chak Shahzad", "timestamp": "1759424629", "serialHash": "0xb2bf0bfec6feba62c64ad7ea94c4697867b74cae5922aa3e7994e7628f0a7d26", "serialNumber": "pa11", "timestampUnix": 1759424629}	2025-10-02 22:04:15.668784+05	8	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-02 22:04:13+05
52	Manu Group	ProductHistoryAdded	0xf331822c0d5d557281964841eb806596888be48c9fcd230d0804351e1c08f4db	{"actor": "Manu Group", "isSold": false, "source": "on-chain", "location": "", "timestamp": "1759428267", "serialHash": "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470", "serialNumber": "Manu Group", "timestampUnix": 1759428267}	2025-10-02 23:04:38.226713+05	9	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-02 23:04:34+05
56	pa111	ProductRegistered	0x3512ddbed535b106bfd78646b83cec5a6c52829d8fe39202d3cfa774dd15102b	{"name": "easysmx", "actor": "Manu Group", "brand": "Easysmx", "isSold": false, "source": "on-chain", "location": "Chak Shahzad; Islamabad; Pakistan", "timestamp": "1759437072", "serialHash": "0x3e2801e885ee80265e2ae9f14015ff90b83ceda25aef7e4faf8269756b642892", "serialNumber": "pa111", "timestampUnix": 1759437072}	2025-10-03 01:43:24.438849+05	10	1	ProductRegistered(string,string,string,string,string,string)	2025-10-03 01:43:22+05
57	pa111	ProductHistoryAdded	0x3512ddbed535b106bfd78646b83cec5a6c52829d8fe39202d3cfa774dd15102b	{"actor": "Manu Group", "isSold": false, "source": "on-chain", "location": "Chak Shahzad; Islamabad; Pakistan", "timestamp": "1759437072", "serialHash": "0x3e2801e885ee80265e2ae9f14015ff90b83ceda25aef7e4faf8269756b642892", "serialNumber": "pa111", "timestampUnix": 1759437072}	2025-10-03 01:43:24.442547+05	10	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-03 01:43:22+05
58	pa11	ProductHistoryAdded	0x8803030b7c474e7fab919037e8290b6830b24efe9bad77570b0d2a1311f258dd	{"actor": "CK Supplier", "isSold": false, "source": "on-chain", "location": "Chak Shahzad; Islamabad; Pakistan", "timestamp": "1759438002", "serialHash": "0xb2bf0bfec6feba62c64ad7ea94c4697867b74cae5922aa3e7994e7628f0a7d26", "serialNumber": "pa11", "timestampUnix": 1759438002}	2025-10-03 01:46:52.898839+05	11	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-03 01:46:51+05
59	pa11	ProductHistoryAdded	0xb1ffc45b4e7eb0e559faeae4d9d6fe933e443cd7db5a436b665819ecbf96541c	{"actor": "RE retailer", "isSold": false, "source": "on-chain", "location": "Chak Shahzad; Islamabad; Pakistan", "timestamp": "1759438077", "serialHash": "0xb2bf0bfec6feba62c64ad7ea94c4697867b74cae5922aa3e7994e7628f0a7d26", "serialNumber": "pa11", "timestampUnix": 1759438077}	2025-10-03 01:48:29.113805+05	12	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-03 01:48:27+05
60	pa11	ProductHistoryAdded	0xaf27ab6335849a6131b6302a1516dbef97e2ee7bf9cb00c1061770517a7349aa	{"actor": "RE retailer", "isSold": true, "source": "on-chain", "location": "Chak Shahzad; Islamabad; Pakistan", "timestamp": "1759438077", "serialHash": "0xb2bf0bfec6feba62c64ad7ea94c4697867b74cae5922aa3e7994e7628f0a7d26", "serialNumber": "pa11", "timestampUnix": 1759438077}	2025-10-03 01:48:43.832891+05	13	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-03 01:48:42+05
62	pa12	ProductRegistered	0x5544b5b7492c3fb9f5861b92369ac1ff72a1ed8c20bf894cd9de313e49bf85a0	{"name": "easysmx", "actor": "Manu Group", "brand": "Easysmx", "isSold": false, "source": "on-chain", "location": "Chak Shahzad; Islamabad; Pakistan", "timestamp": "1759438633", "serialHash": "0xed061d4d7371d49acc4e04dc31c0f6c1cfa0f22c8c5ace509789863e07ea1b60", "serialNumber": "pa12", "timestampUnix": 1759438633}	2025-10-03 01:57:26.170531+05	14	1	ProductRegistered(string,string,string,string,string,string)	2025-10-03 01:57:23+05
63	pa12	ProductHistoryAdded	0x5544b5b7492c3fb9f5861b92369ac1ff72a1ed8c20bf894cd9de313e49bf85a0	{"actor": "Manu Group", "isSold": false, "source": "on-chain", "location": "Chak Shahzad; Islamabad; Pakistan", "timestamp": "1759438633", "serialHash": "0xed061d4d7371d49acc4e04dc31c0f6c1cfa0f22c8c5ace509789863e07ea1b60", "serialNumber": "pa12", "timestampUnix": 1759438633}	2025-10-03 01:57:26.179161+05	14	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-03 01:57:23+05
64	pa12	ProductHistoryAdded	0xb374d911a25df1d117307bca48a14bc11a7eec1318e369594d7fc3cb866b0039	{"actor": "CK Supplier", "isSold": false, "source": "on-chain", "location": "", "timestamp": "1759438768", "serialHash": "0xed061d4d7371d49acc4e04dc31c0f6c1cfa0f22c8c5ace509789863e07ea1b60", "serialNumber": "pa12", "timestampUnix": 1759438768}	2025-10-03 01:59:58.4818+05	15	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-03 01:59:55+05
65	pa12	ProductHistoryAdded	0x22b6656bf5f40817bad98f045decec3053a13b23342c34ee2d7690a7fad473e5	{"actor": "RE retailer", "isSold": true, "source": "on-chain", "location": "Chak Shahzad; Islamabad; Pakistan", "timestamp": "1759439441", "serialHash": "0xed061d4d7371d49acc4e04dc31c0f6c1cfa0f22c8c5ace509789863e07ea1b60", "serialNumber": "pa12", "timestampUnix": 1759439441}	2025-10-03 02:10:56.666636+05	2	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-03 02:10:56+05
66	pg-12	ProductRegistered	0x6030c21f2662fbe7ece3a97a0172ed6f58b1b0631eaecfc9ad06186d177c8c1e	{"name": "easysmx", "actor": "Manu Group", "brand": "Easysmx", "isSold": false, "source": "on-chain", "location": "Chak Shahzad; Islamabad; Pakistan", "timestamp": "1759439545", "serialHash": "0x8e36553ca0d13bae567ed44fa63a29b6b01bb7bc7e11c2a23d3b05c1c85a3213", "serialNumber": "pg-12", "timestampUnix": 1759439545}	2025-10-03 02:12:52.922368+05	3	1	ProductRegistered(string,string,string,string,string,string)	2025-10-03 02:12:49+05
67	pg-12	ProductHistoryAdded	0x6030c21f2662fbe7ece3a97a0172ed6f58b1b0631eaecfc9ad06186d177c8c1e	{"actor": "Manu Group", "isSold": false, "source": "on-chain", "location": "Chak Shahzad; Islamabad; Pakistan", "timestamp": "1759439545", "serialHash": "0x8e36553ca0d13bae567ed44fa63a29b6b01bb7bc7e11c2a23d3b05c1c85a3213", "serialNumber": "pg-12", "timestampUnix": 1759439545}	2025-10-03 02:12:52.929829+05	3	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-03 02:12:49+05
68	pg-12	ProductHistoryAdded	0xdaa27324e5a6e7e6505c632b3fe3294237d7678fb600471d25d3c3b8727e0061	{"actor": "CK Supplier", "isSold": false, "source": "on-chain", "location": "", "timestamp": "1759439922", "serialHash": "0x8e36553ca0d13bae567ed44fa63a29b6b01bb7bc7e11c2a23d3b05c1c85a3213", "serialNumber": "pg-12", "timestampUnix": 1759439922}	2025-10-03 02:18:49.677013+05	4	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-03 02:18:47+05
71	pg12	ProductRegistered	0x6ee1a81c059f08a9038300c0a53263d1814ac82beb58f81eea0cee60b4d6029d	{"name": "easysmx", "actor": "Manu Group", "brand": "Easysmx", "isSold": false, "source": "on-chain", "location": "Chak Shahzad; Islamabad; Pakistan", "timestamp": "1759528408", "serialHash": "0x4f7e2de18895140036269c556cdefbf440b0626c4ca7b94ba1bfd21748584487", "serialNumber": "pg12", "timestampUnix": 1759528408}	2025-10-04 02:53:54.825465+05	2	1	ProductRegistered(string,string,string,string,string,string)	2025-10-04 02:53:51+05
72	pg12	ProductHistoryAdded	0x6ee1a81c059f08a9038300c0a53263d1814ac82beb58f81eea0cee60b4d6029d	{"actor": "Manu Group", "isSold": false, "source": "on-chain", "location": "Chak Shahzad; Islamabad; Pakistan", "timestamp": "1759528408", "serialHash": "0x4f7e2de18895140036269c556cdefbf440b0626c4ca7b94ba1bfd21748584487", "serialNumber": "pg12", "timestampUnix": 1759528408}	2025-10-04 02:53:54.832981+05	2	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-04 02:53:51+05
73	pg12	ProductHistoryAdded	0x1a858bf1ef3d4d05d0807cecef924500a47c23afff821028977e6580fe9531e3	{"actor": "CK Supplier", "isSold": false, "source": "on-chain", "location": "Chak Shahzad; Islamabad; Pakistan", "timestamp": "1759528499", "serialHash": "0x4f7e2de18895140036269c556cdefbf440b0626c4ca7b94ba1bfd21748584487", "serialNumber": "pg12", "timestampUnix": 1759528499}	2025-10-04 02:55:10.983334+05	3	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-04 02:55:06+05
74	CK Supplier	ProductHistoryAdded	0xb03f6154d9b38de1c644daf272eeed169501852fa992945072b35ef941f0cce1	{"actor": "CK Supplier", "isSold": false, "source": "on-chain", "location": "lat:33.658626506415246;lon:73.15572192464732", "timestamp": "1759528878", "serialHash": "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470", "serialNumber": "CK Supplier", "timestampUnix": 1759528878}	2025-10-04 03:01:43.791706+05	4	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-04 03:01:39+05
75	pg12	ProductHistoryAdded	0x34deba05b10bac073da8f37d9e642fa2ee5258fb01f61ef9c0b20c0c526b2cdf	{"actor": "RE retailer", "isSold": false, "source": "on-chain", "location": "Chak Shahzad; Islamabad; Pakistan", "timestamp": "1759530196", "serialHash": "0x4f7e2de18895140036269c556cdefbf440b0626c4ca7b94ba1bfd21748584487", "serialNumber": "pg12", "timestampUnix": 1759530196}	2025-10-04 03:23:34.26671+05	5	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-04 03:23:32+05
76	pg12	ProductHistoryAdded	0x44e295ba905811444b27323e67315d9ac0996b4ae1bae6f7f26ad8863c101d89	{"actor": "RE retailer", "isSold": true, "source": "on-chain", "location": "Chak Shahzad; Islamabad; Pakistan", "timestamp": "1759530196", "serialHash": "0x4f7e2de18895140036269c556cdefbf440b0626c4ca7b94ba1bfd21748584487", "serialNumber": "pg12", "timestampUnix": 1759530196}	2025-10-04 03:23:58.316095+05	6	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-04 03:23:55+05
77	pg12	ProductHistoryAdded	0x1dc54e10b367d563e9ac607104e4ca83a5f4c025f5d3f32644439887ebf70927	{"actor": "CK Supplier", "isSold": false, "source": "on-chain", "location": "Chak Shahzad; Islamabad; Pakistan", "timestamp": "1759531769", "serialHash": "0x4f7e2de18895140036269c556cdefbf440b0626c4ca7b94ba1bfd21748584487", "serialNumber": "pg12", "timestampUnix": 1759531769}	2025-10-04 03:49:45.258699+05	7	0	ProductHistoryAdded(string,string,string,string,bool)	2025-10-04 03:49:42+05
\.


--
-- TOC entry 5061 (class 0 OID 32905)
-- Dependencies: 241
-- Data for Name: consumer_ownership; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.consumer_ownership (id, serial_number, owner_name, acquired_at, transferred_at, created_at, owner_identifier) FROM stdin;
1	a112	aizaz	2025-09-30 06:22:53.311736+05	\N	2025-09-30 06:22:53.311736+05	7979
2	a243	Pakistan	2025-10-01 03:59:13.441587+05	\N	2025-10-01 03:59:13.441587+05	09877
3	pa11	aizaz	2025-10-03 01:48:43.709864+05	\N	2025-10-03 01:48:43.709864+05	0909
4	pa12	haseeb	2025-10-03 02:10:56.110327+05	\N	2025-10-03 02:10:56.110327+05	sadfh
5	pg12	Azzy	2025-10-04 03:23:56.263653+05	\N	2025-10-04 03:23:56.263653+05	03458384
\.


--
-- TOC entry 5049 (class 0 OID 24681)
-- Dependencies: 229
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory (id, serial_number, owner_role, owner_username, status, qty, updated_at) FROM stdin;
\.


--
-- TOC entry 5051 (class 0 OID 24698)
-- Dependencies: 231
-- Data for Name: inventory_moves; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.inventory_moves (id, serial_number, from_owner_role, from_owner_username, to_owner_role, to_owner_username, qty, status, moved_at, actor_username) FROM stdin;
\.


--
-- TOC entry 5043 (class 0 OID 16414)
-- Dependencies: 223
-- Data for Name: login_attempts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.login_attempts (id, username, attempt_time, success, ip_address, user_agent) FROM stdin;
1	admin	2025-05-18 01:22:55.002337	t	::1	\N
2	admin	2025-05-18 01:23:07.567724	t	::1	\N
3	admin	2025-05-18 01:23:24.006216	t	::1	\N
4	admin	2025-05-18 01:23:27.486676	t	::1	\N
5	admin	2025-05-18 01:23:30.390155	t	::1	\N
6	admin	2025-05-18 01:40:01.4205	t	::1	\N
7	admin	2025-05-18 01:44:15.95156	t	::1	\N
8	admin	2025-05-18 01:53:04.318029	t	::1	\N
9	admin	2025-05-18 01:53:13.918682	t	::1	\N
10	admin	2025-05-18 01:53:16.237329	t	::1	\N
11	admin	2025-05-18 01:53:19.588919	t	::1	\N
12	admin	2025-05-18 01:53:49.695979	t	::1	\N
13	admin	2025-05-18 01:53:52.595514	t	::1	\N
14	admin	2025-05-18 01:53:55.818495	t	::1	\N
15	admin	2025-05-18 01:54:09.987547	t	::1	\N
16	admin	2025-05-18 01:55:06.086099	t	::1	\N
17	admin	2025-05-18 01:56:27.357179	t	::1	\N
18	admin	2025-05-18 02:27:54.812851	t	::1	\N
19	admin	2025-05-18 02:31:13.053225	t	::1	\N
20	admin	2025-05-18 02:32:14.994416	t	::1	\N
21	admin	2025-05-18 02:32:20.467681	t	::1	\N
22	admin	2025-05-18 02:32:52.119898	t	::1	\N
23	admin	2025-05-18 02:33:29.134417	t	::1	\N
24	manu	2025-05-18 02:40:25.718858	t	::1	\N
25	manu	2025-05-18 02:40:44.847469	t	::1	\N
26	manu	2025-05-18 02:48:01.670075	t	::1	\N
27	manu	2025-05-18 02:48:27.152975	t	::1	\N
28	manu	2025-05-18 02:50:07.182773	t	::1	\N
29	admin	2025-05-18 02:51:04.27069	t	::1	\N
30	admin	2025-05-19 21:03:51.986072	t	::1	\N
31	manu	2025-05-19 21:04:01.725716	t	::1	\N
32	manu	2025-05-19 21:04:27.151614	t	::1	\N
33	manu	2025-05-19 21:06:07.658963	t	::1	\N
34	manu	2025-05-19 21:06:53.145324	t	::1	\N
35	manu	2025-05-19 21:08:02.457322	t	::1	\N
36	manu	2025-05-19 21:10:28.751467	t	::1	\N
37	manu	2025-05-19 21:10:46.847969	t	::1	\N
38	manu	2025-05-19 21:11:09.826179	t	::1	\N
39	manu	2025-05-19 21:13:05.508294	t	::1	\N
40	manu	2025-05-19 21:13:33.660959	t	::1	\N
41	manu	2025-05-19 21:19:17.136387	t	::1	\N
42	manu	2025-05-19 21:25:28.289572	t	::1	\N
43	manu	2025-05-19 21:28:36.437909	t	::1	\N
44	manu	2025-05-19 21:30:01.428133	t	::1	\N
45	manu	2025-05-19 21:33:51.246963	t	::1	\N
46	manu	2025-05-19 21:39:03.493675	t	::1	\N
47	manu	2025-05-19 21:41:33.45071	t	::1	\N
48	admin	2025-05-19 21:43:17.728382	t	::1	\N
49	admin	2025-05-19 21:43:28.827896	t	::1	\N
50	admin	2025-05-19 21:45:29.340689	t	::1	\N
51	admin	2025-05-19 21:47:18.433699	t	::1	\N
52	admin	2025-05-19 21:47:43.017489	t	::1	\N
53	manu	2025-05-19 21:47:54.199577	t	::1	\N
54	manu	2025-05-19 21:48:13.033431	t	::1	\N
55	supp	2025-05-19 21:48:28.061332	t	::1	\N
56	supp	2025-05-19 21:48:41.369898	t	::1	\N
57	manu	2025-05-19 21:49:41.025549	t	::1	\N
58	supp	2025-05-19 21:50:22.773027	t	::1	\N
59	retailer	2025-05-19 21:51:27.684347	t	::1	\N
60	retailer	2025-05-19 21:57:41.804966	t	::1	\N
61	manu	2025-05-19 22:07:39.734165	t	::1	\N
62	manu	2025-05-19 22:07:46.384115	t	::1	\N
63	manu	2025-05-19 22:13:54.596856	t	::1	\N
64	manu	2025-05-19 22:41:50.429684	t	::1	\N
65	manu	2025-05-19 22:45:03.004595	t	::1	\N
66	manu	2025-05-19 22:48:02.222	t	::1	\N
67	manu	2025-05-19 22:49:31.209815	t	::1	\N
68	manu	2025-05-19 22:54:14.28033	t	::1	\N
69	manu	2025-05-19 22:56:03.09626	t	::1	\N
70	manu	2025-05-19 22:58:55.39866	t	::1	\N
71	manu	2025-05-19 23:12:02.688307	f	::1	\N
72	manu	2025-05-19 23:12:07.159936	t	::1	\N
73	manu	2025-05-19 23:12:44.644104	f	::1	\N
74	menu	2025-05-19 23:12:53.103508	f	::1	\N
75	menu	2025-05-19 23:12:57.457188	f	::1	\N
76	manu	2025-05-19 23:13:04.105464	f	::1	\N
77	manu	2025-05-19 23:13:08.20273	t	::1	\N
78	retailer	2025-05-19 23:15:18.943376	t	::1	\N
79	supp	2025-05-19 23:15:37.708474	t	::1	\N
80	admin	2025-05-19 23:16:53.777208	t	::1	\N
81	admin	2025-05-19 23:17:06.964738	t	::1	\N
82	admin	2025-05-19 23:17:09.413705	t	::1	\N
83	admin	2025-05-19 23:17:11.334132	t	::1	\N
84	admin	2025-05-19 23:20:20.142003	t	::1	\N
85	manu	2025-05-19 23:20:34.075128	t	::1	\N
86	admin	2025-05-19 23:44:47.591083	t	::1	\N
87	admin	2025-05-20 00:05:24.042217	t	::1	\N
88	admin	2025-05-20 00:13:17.347648	t	::1	\N
89	admin	2025-05-20 00:13:21.750758	t	::1	\N
90	admin	2025-05-20 00:15:37.123786	t	::1	\N
91	admin	2025-05-20 00:17:53.147051	t	::1	\N
92	admin	2025-05-20 00:19:04.965445	t	::1	\N
93	admin	2025-05-20 00:19:55.643154	t	::1	\N
94	admin	2025-05-20 00:20:56.116365	t	::1	\N
95	admin	2025-05-20 00:26:31.822084	t	::1	\N
96	admin	2025-05-20 00:33:10.083287	t	::1	\N
97	admin	2025-05-20 00:50:11.167324	t	::1	\N
98	admin	2025-05-20 00:58:21.51547	t	::1	\N
99	admin	2025-05-20 01:01:07.558133	t	::1	\N
100	admin	2025-05-20 01:02:42.932733	t	::1	\N
101	admin	2025-05-20 01:03:04.39655	t	::1	\N
102	admin	2025-05-20 01:07:36.897333	t	::1	\N
103	admin	2025-05-20 01:11:51.000635	t	::1	\N
104	admin	2025-05-20 01:24:43.424797	t	::1	\N
105	admin	2025-05-20 01:26:48.144004	t	::1	\N
106	admin	2025-05-20 01:26:50.507494	t	::1	\N
107	pakis	2025-05-20 01:27:44.967305	t	::1	\N
108	pakis	2025-05-20 01:28:01.990091	t	::1	\N
109	pakis	2025-05-20 01:30:36.859384	t	::1	\N
110	admin	2025-05-20 01:30:56.877793	t	::1	\N
111	anna	2025-05-20 01:31:58.950542	t	::1	\N
112	admin	2025-05-20 01:34:23.268607	f	::1	\N
113	admin	2025-05-20 01:34:28.803501	t	::1	\N
114	admin	2025-05-20 01:35:12.470981	t	::1	\N
115	admin	2025-05-20 02:18:57.962294	t	::1	\N
116	admin	2025-05-21 00:53:27.698837	t	::1	\N
117	admin	2025-05-21 01:37:25.019381	t	::1	\N
118	admin	2025-05-21 01:39:05.591209	t	::1	\N
119	admin	2025-05-21 01:54:01.66969	t	::1	\N
120	admin	2025-05-21 01:56:23.79224	t	::1	\N
121	admin	2025-05-21 01:56:39.978361	t	::1	\N
122	admin	2025-05-21 01:57:03.795462	t	::1	\N
123	admin	2025-05-21 01:57:22.899011	t	::1	\N
124	admin	2025-05-21 01:57:46.4324	t	::1	\N
125	admin	2025-05-21 02:01:15.516265	t	::1	\N
126	admin	2025-05-21 02:07:10.183601	t	::1	\N
127	admin	2025-05-21 02:10:22.200122	t	::1	\N
128	menu	2025-05-21 02:10:48.272366	f	::1	\N
129	menu	2025-05-21 02:10:54.570386	f	::1	\N
130	manu	2025-05-21 02:10:59.935957	t	::1	\N
131	manu	2025-05-21 02:15:46.292565	t	::1	\N
132	admin	2025-05-21 02:15:53.924415	t	::1	\N
133	admin	2025-05-21 02:16:02.574986	t	::1	\N
134	admin	2025-05-21 02:24:12.371064	t	::1	\N
135	admin	2025-05-21 02:24:34.155574	t	::1	\N
136	admin	2025-05-21 02:26:07.314581	t	::1	\N
137	admin	2025-05-21 02:26:12.480404	t	::1	\N
138	admin	2025-05-21 02:27:07.456063	t	::1	\N
139	admin	2025-05-21 02:35:14.650601	t	::1	\N
140	admin	2025-05-21 02:35:42.818083	t	::1	\N
141	admin	2025-05-21 02:40:12.88605	t	::1	\N
142	admin	2025-05-21 04:00:03.602704	t	::1	\N
143	admin	2025-05-21 04:09:39.821924	t	::1	\N
144	admin	2025-05-21 04:12:25.421864	t	::1	\N
145	manu	2025-05-21 04:16:33.176191	t	::1	\N
146	manu	2025-05-21 04:18:07.767372	t	::1	\N
147	supp	2025-05-21 04:22:08.697222	t	::1	\N
148	supp	2025-05-21 04:25:25.859492	t	::1	\N
149	manu	2025-05-21 04:25:32.135478	t	::1	\N
150	supp	2025-05-21 04:28:02.425224	t	::1	\N
151	supp	2025-05-24 02:51:08.334264	t	::1	\N
152	supp	2025-05-24 02:54:47.492032	t	::1	\N
153	supp	2025-05-24 02:54:56.018715	t	::1	\N
154	manu	2025-05-24 02:55:07.307924	t	::1	\N
155	admin	2025-05-24 02:58:44.28934	t	::1	\N
156	supp	2025-05-24 02:59:30.761377	t	::1	\N
157	manu	2025-05-24 02:59:46.490015	t	::1	\N
158	manu	2025-05-24 03:08:24.587745	t	::1	\N
159	manu	2025-05-24 03:11:09.771248	t	::1	\N
160	manu	2025-05-24 03:19:32.838614	t	::1	\N
161	manu	2025-05-24 03:21:32.288248	t	::1	\N
162	manu	2025-05-24 03:25:36.321127	t	::1	\N
163	manu	2025-05-24 03:29:14.76239	t	::1	\N
164	manu	2025-05-24 03:35:46.867008	t	::1	\N
165	manu	2025-05-24 03:38:23.212354	t	::1	\N
166	manu	2025-05-24 03:39:30.141837	t	::1	\N
167	manu	2025-05-24 03:42:56.550325	t	::1	\N
168	manu	2025-05-24 04:09:52.658369	t	::1	\N
169	manu	2025-05-24 04:19:32.038634	t	::1	\N
170	manu	2025-05-24 04:19:55.30813	t	::1	\N
171	manu	2025-05-24 04:23:18.515463	t	::1	\N
172	manu	2025-05-24 04:36:08.551984	t	::1	\N
173	manu	2025-05-24 04:42:56.447414	t	::1	\N
174	manu	2025-05-24 04:55:13.237965	t	::1	\N
175	manu	2025-05-24 04:58:04.198617	t	::1	\N
176	manu	2025-05-24 05:01:49.987377	t	::1	\N
177	supp	2025-05-24 05:05:21.845718	t	::1	\N
178	retailer	2025-05-24 05:06:15.577257	t	::1	\N
179	retailer	2025-05-24 05:08:37.775409	t	::1	\N
180	admin	2025-05-24 05:08:54.609481	t	::1	\N
181	manu	2025-05-24 18:21:38.849595	t	::1	\N
182	supp	2025-05-24 18:23:31.853072	t	::1	\N
183	admin	2025-05-24 18:23:50.864429	t	::1	\N
184	supp	2025-05-24 18:24:12.626091	t	::1	\N
185	retailer	2025-05-24 18:25:30.453272	t	::1	\N
186	admin	2025-05-24 18:29:30.333841	t	::1	\N
187	manu	2025-05-24 18:34:07.972608	t	::1	\N
188	retailer	2025-05-24 18:35:02.990084	t	::1	\N
189	supp	2025-05-24 18:35:08.976335	t	::1	\N
190	retailer	2025-05-24 18:38:52.06363	t	::1	\N
191	manu	2025-05-24 18:39:22.859025	t	::1	\N
192	retailer	2025-05-24 18:39:50.343767	t	::1	\N
193	manu	2025-05-24 18:40:08.455943	t	::1	\N
194	retailer	2025-05-24 19:08:19.785504	t	::1	\N
195	retailer	2025-05-24 19:13:19.654385	t	::1	\N
196	manu	2025-05-24 19:31:50.981747	t	::1	\N
197	manu	2025-05-24 19:35:51.674377	t	::1	\N
198	manu	2025-05-24 19:38:15.665251	t	::1	\N
199	manu	2025-05-24 19:39:15.508786	t	::1	\N
200	manu	2025-05-24 19:40:33.637055	t	::1	\N
201	manu	2025-05-24 19:47:48.256281	t	::1	\N
202	supp	2025-05-24 19:49:58.598312	t	::1	\N
203	manu	2025-05-24 19:50:28.364304	t	::1	\N
204	supp	2025-05-24 19:51:03.263431	t	::1	\N
205	manu	2025-05-24 19:52:24.312686	t	::1	\N
206	manu	2025-05-24 19:53:39.018338	t	::1	\N
207	manu	2025-05-24 20:05:18.188909	t	::1	\N
208	manu	2025-05-24 20:11:35.747811	t	::1	\N
209	manu	2025-05-24 20:50:31.464064	t	::1	\N
210	manu	2025-05-24 21:01:46.100654	t	::1	\N
211	manu	2025-05-24 21:05:14.460084	t	::1	\N
212	manu	2025-05-24 21:07:51.216518	t	::1	\N
213	manu	2025-05-24 21:21:10.666398	t	::1	\N
214	manu	2025-05-24 21:40:40.524756	t	::1	\N
215	supp	2025-05-24 21:45:09.610966	t	::1	\N
216	retailer	2025-05-24 21:52:26.038226	t	::1	\N
217	retailer	2025-05-24 21:53:56.335581	t	::1	\N
218	retailer	2025-05-24 22:11:47.481635	t	::1	\N
219	retailer	2025-05-24 22:11:54.201458	t	::1	\N
220	retailer	2025-05-24 22:11:57.3052	t	::1	\N
221	retailer	2025-05-24 22:15:23.409515	t	::1	\N
222	admin	2025-05-24 23:17:55.366832	t	::1	\N
223	admin	2025-05-24 23:18:48.375419	t	::1	\N
224	manu	2025-05-24 23:19:07.958794	t	::1	\N
225	supp	2025-05-24 23:23:30.683153	t	::1	\N
226	supp	2025-05-24 23:23:46.281264	t	::1	\N
227	supp	2025-05-24 23:24:06.172941	t	::1	\N
228	supp	2025-05-24 23:24:24.222332	t	::1	\N
229	supp	2025-05-24 23:24:54.849473	t	::1	\N
230	supp	2025-05-24 23:25:38.29297	t	::1	\N
231	supp	2025-05-24 23:27:33.047003	t	::1	\N
232	supp	2025-05-24 23:41:34.88127	t	::1	\N
233	manu	2025-05-24 23:48:12.234116	t	::1	\N
234	supp	2025-05-24 23:49:22.844587	t	::1	\N
235	retailer	2025-05-24 23:50:27.28755	t	::1	\N
236	admin	2025-05-25 00:03:28.950505	t	::1	\N
237	admin	2025-05-25 00:05:24.569693	t	::1	\N
238	admin	2025-05-25 00:06:36.95287	t	::1	\N
239	admin	2025-05-25 00:15:37.279334	t	::1	\N
240	manu	2025-05-25 00:16:30.634379	t	::1	\N
241	supp	2025-05-25 00:19:09.597331	t	::1	\N
242	supp	2025-05-25 00:24:30.72638	t	::1	\N
243	retailer	2025-05-25 00:25:28.085152	t	::1	\N
244	admin	2025-05-25 01:33:34.832787	f	::1	\N
245	admin	2025-05-25 01:33:38.466487	t	::1	\N
246	admin	2025-05-25 01:37:44.463453	t	::1	\N
247	manu	2025-05-25 01:40:39.804989	t	::1	\N
248	retailer	2025-05-25 01:41:42.126915	t	::1	\N
249	manu	2025-05-25 01:51:04.457858	t	::1	\N
250	manu	2025-05-25 01:51:47.606362	t	::1	\N
251	supp	2025-05-25 01:53:44.590854	t	::1	\N
252	retailer	2025-05-25 01:55:53.561653	t	::1	\N
253	manu	2025-05-25 01:58:48.490714	t	::1	\N
254	retailer	2025-05-25 02:01:11.864789	t	::1	\N
255	supp	2025-05-25 02:01:22.447156	t	::1	\N
256	retailer	2025-05-25 02:03:13.098601	t	::1	\N
257	admin	2025-05-25 02:08:53.70869	t	::1	\N
258	admin	2025-05-26 01:01:47.752432	t	::1	\N
259	manu	2025-05-26 01:05:45.114953	t	::1	\N
260	supp	2025-05-26 01:08:49.954915	t	::1	\N
261	supp	2025-05-26 01:09:52.473088	t	::1	\N
262	supp	2025-05-26 01:10:25.065423	t	::1	\N
263	retailer	2025-05-26 01:15:11.069409	t	::1	\N
264	admin	2025-05-26 01:20:14.347737	t	::1	\N
265	admin	2025-05-26 07:37:39.45732	t	::1	\N
266	manu	2025-05-26 07:38:42.867989	t	::1	\N
267	manu	2025-05-26 07:39:02.146028	t	::1	\N
268	supp	2025-05-26 07:40:24.038552	t	::1	\N
269	admin	2025-05-26 07:43:43.862287	t	::1	\N
270	manu	2025-05-26 07:44:20.800841	t	::1	\N
271	manu	2025-05-26 07:44:33.187836	t	::1	\N
272	supp	2025-05-26 07:45:43.120505	t	::1	\N
273	retailer	2025-05-26 07:46:29.678032	t	::1	\N
274	retailer	2025-05-26 07:46:50.306011	t	::1	\N
275	retailer	2025-05-26 07:46:55.443951	t	::1	\N
276	retailer	2025-05-26 07:50:11.515077	t	::1	\N
277	retailer	2025-05-26 07:52:45.245115	t	::1	\N
278	admin	2025-05-26 08:02:36.005683	t	::1	\N
279	manu	2025-05-26 08:03:08.917507	t	::1	\N
280	manu	2025-05-26 08:03:20.335168	t	::1	\N
281	supp	2025-05-26 08:04:24.213924	t	::1	\N
282	retailer	2025-05-26 08:05:13.729087	t	::1	\N
283	admin	2025-05-26 08:18:40.177854	t	::1	\N
284	manu	2025-05-26 08:19:11.950369	t	::1	\N
285	manu	2025-05-26 08:19:24.714946	t	::1	\N
286	supp	2025-05-26 08:20:33.871581	t	::1	\N
287	retailer	2025-05-26 08:21:09.29807	t	::1	\N
288	retailer	2025-05-26 08:21:59.00304	t	::1	\N
289	retailer	2025-05-26 08:25:03.550312	t	::1	\N
290	manu	2025-05-26 08:35:19.58694	t	::1	\N
291	manu	2025-05-26 08:36:23.454107	t	::1	\N
292	manu	2025-05-26 08:36:38.128584	t	::1	\N
293	supp	2025-05-26 08:39:07.00274	t	::1	\N
294	retailer	2025-05-26 08:40:42.111294	t	::1	\N
295	admin	2025-07-31 12:19:43.755707	f	::1	\N
296	admin	2025-07-31 12:19:47.279356	f	::1	\N
297	admin	2025-07-31 12:19:47.823037	f	::1	\N
298	admin	2025-07-31 12:19:48.174731	f	::1	\N
299	retailer	2025-07-31 12:19:55.672477	t	::1	\N
300	manu	2025-07-31 12:39:31.253506	t	::1	\N
301	admin	2025-07-31 12:39:59.735538	t	::1	\N
302	retailer	2025-09-17 21:30:27.019293	t	::1	\N
303	retailer	2025-09-17 21:30:47.744589	t	::1	\N
304	admin	2025-09-17 21:31:55.909907	f	::1	\N
305	admin	2025-09-17 21:32:02.027066	t	::1	\N
306	retailer	2025-09-17 21:32:25.220292	t	::1	\N
307	supp	2025-09-17 21:32:30.63032	t	::1	\N
308	supp	2025-09-17 21:36:04.661161	t	::1	\N
309	supp	2025-09-23 05:18:43.075296	t	::1	\N
310	manu	2025-09-23 05:19:23.806625	t	::1	\N
311	supp	2025-09-23 05:20:44.534749	t	::1	\N
312	retailer	2025-09-23 05:21:24.138446	t	::1	\N
313	retailer	2025-09-24 01:05:36.239843	t	::1	\N
314	admin	2025-09-24 01:06:06.933873	t	::1	\N
315	admin	2025-09-24 01:10:51.283238	t	::1	\N
316	retailer	2025-09-24 01:12:52.086689	t	::1	\N
317	manu	2025-09-24 01:13:18.804564	t	::1	\N
318	admin	2025-09-24 01:14:07.523849	t	::1	\N
319	admin	2025-09-24 01:16:58.762466	t	::1	\N
320	manu	2025-09-24 01:17:03.988735	t	::1	\N
321	manu	2025-09-24 01:19:53.362301	t	::1	\N
322	admin	2025-09-24 01:19:58.30238	t	::1	\N
323	manu	2025-09-24 01:31:45.202944	t	::1	\N
324	manu	2025-09-24 01:39:26.681147	t	::1	\N
325	admin	2025-09-24 01:41:32.328106	t	::1	\N
326	manu	2025-09-24 01:43:17.8703	t	::1	\N
327	manu	2025-09-24 01:45:56.122733	t	::1	\N
328	admin	2025-09-24 01:46:09.190908	t	::1	\N
329	retailer	2025-09-24 01:54:41.707264	t	::1	\N
330	retailer	2025-09-24 02:02:12.385816	t	::1	\N
331	supp	2025-09-24 02:17:55.207248	t	::1	\N
332	retailer	2025-09-24 02:20:21.37159	t	::1	\N
333	manu	2025-09-24 02:34:38.654822	t	::1	\N
334	admin	2025-09-24 02:37:03.95462	t	::1	\N
335	manu	2025-09-24 02:38:25.932811	t	::1	\N
336	admin	2025-09-24 02:47:32.427761	t	::1	\N
337	manu	2025-09-24 02:47:59.67216	t	::1	\N
338	retailer	2025-09-24 02:49:27.747427	t	::1	\N
339	retailer	2025-09-24 02:51:20.477055	t	::1	\N
340	manu	2025-09-24 02:51:31.279011	t	::1	\N
341	manu	2025-09-24 02:52:38.569871	t	::1	\N
342	retailer	2025-09-24 02:52:46.929575	t	::1	\N
343	admin	2025-09-24 02:53:29.798416	t	::1	\N
344	admin	2025-09-24 02:58:18.058116	t	::1	\N
345	admin	2025-09-24 03:04:34.812413	t	::1	\N
346	admin	2025-09-24 03:18:16.155359	t	::1	\N
347	admin	2025-09-24 03:18:20.609697	t	::1	\N
348	retailer	2025-09-24 03:18:29.584551	t	::1	\N
349	retailer	2025-09-24 03:39:04.055946	t	::1	\N
350	retailer	2025-09-24 03:39:14.009256	t	::1	\N
351	admin	2025-09-24 03:39:28.327506	t	::1	\N
352	admin	2025-09-24 03:44:42.923178	t	::1	\N
353	admin	2025-09-24 03:45:21.215018	t	::1	\N
354	admin	2025-09-24 03:53:26.532507	t	::1	\N
355	admin	2025-09-24 03:54:49.715335	t	::1	\N
356	admin	2025-09-24 03:55:34.005968	t	::1	\N
357	admin	2025-09-24 03:59:29.74921	t	::1	\N
358	retailer	2025-09-24 03:59:56.336473	t	::1	\N
359	admin	2025-09-24 04:01:59.731884	t	::1	\N
360	retailer	2025-09-24 04:06:03.834018	t	::1	\N
361	retailer	2025-09-24 04:19:26.166297	t	::1	\N
362	admin	2025-09-26 02:59:03.605756	t	::1	\N
363	retailer	2025-09-26 02:59:58.244917	t	::1	\N
364	admin	2025-09-26 03:00:03.218157	t	::1	\N
365	admin	2025-09-26 03:16:52.794831	t	::1	\N
366	admin	2025-09-26 03:25:55.400902	t	::1	\N
367	admin	2025-09-26 03:28:54.520963	t	::1	\N
368	testuser	2025-09-28 01:27:43.113051	f	::1	\N
369	admin	2025-09-28 01:32:04.245956	f	::1	\N
370	admin	2025-09-28 01:32:08.590647	f	::1	\N
371	admin	2025-09-28 01:32:09.829558	f	::1	\N
372	admin	2025-09-28 01:32:30.17287	f	::1	\N
373	retailer	2025-09-28 01:32:33.854844	t	::1	\N
374	admin	2025-09-28 01:33:42.71922	f	::1	\N
375	retailer	2025-09-28 01:34:14.445152	t	::1	\N
376	supp	2025-09-28 01:34:19.497931	t	::1	\N
377	admin	2025-09-28 01:34:42.594748	f	::1	\N
378	admin	2025-09-28 01:34:42.890983	f	::1	\N
379	retailer	2025-09-28 01:44:31.475346	t	::1	\N
380	admin	2025-09-28 01:44:48.931114	f	::1	\N
381	admin	2025-09-28 01:51:27.026996	f	::1	\N
382	admin	2025-09-28 01:52:31.605714	f	::1	\N
383	admin	2025-09-28 01:52:46.533569	f	::1	\N
384	admin	2025-09-28 01:53:28.143612	t	::1	\N
385	admin	2025-09-28 01:53:41.589099	t	::1	\N
386	password-reset	2025-09-28 01:58:04.416409	f	::1	\N
387	admin	2025-09-28 01:58:15.696747	f	::1	\N
388	admin	2025-09-28 01:58:15.799304	f	::1	\N
389	admin	2025-09-28 01:58:19.074915	t	::1	\N
390	manu	2025-09-28 01:58:35.515796	t	::1	\N
391	retailer	2025-09-28 01:58:44.811713	t	::1	\N
392	supp	2025-09-28 01:58:56.041946	t	::1	\N
393	admin	2025-09-28 01:59:11.049564	t	::1	\N
394	admin	2025-09-28 02:00:48.749257	t	::1	\N
395	admin	2025-09-28 02:00:57.953137	t	::1	\N
396	admin	2025-09-28 02:01:29.931021	t	::1	\N
397	supp	2025-09-28 02:01:48.306251	t	::1	\N
398	manu	2025-09-28 02:02:00.91444	t	::1	\N
399	admin	2025-09-28 02:02:06.107223	t	::1	\N
400	admin	2025-09-28 02:03:37.94746	t	::1	\N
401	admin	2025-09-28 02:04:05.463675	t	::1	\N
402	admin	2025-09-28 02:04:30.032756	t	::1	\N
403	admin	2025-09-28 02:07:02.029098	t	::1	\N
404	admin	2025-09-28 02:08:03.504154	t	::1	\N
405	admin	2025-09-28 02:11:55.512675	t	::1	\N
406	admin	2025-09-28 02:16:50.033881	t	::1	\N
407	admin	2025-09-28 02:22:45.768756	t	::1	\N
408	admin	2025-09-28 02:23:46.577719	t	::1	\N
409	admin	2025-09-28 02:23:58.504439	t	::1	\N
410	admin	2025-09-28 02:24:12.642709	t	::1	\N
411	admin	2025-09-28 02:27:34.520163	t	::1	\N
412	admin	2025-09-28 02:28:10.898626	t	::1	\N
413	manu	2025-09-28 02:28:33.811628	t	::1	\N
414	password-reset	2025-09-28 02:36:57.303224	f	::1	\N
415	admin	2025-09-28 02:37:06.223626	t	::1	\N
416	2fa	2025-09-28 02:37:24.644827	f	::1	\N
417	2fa	2025-09-28 02:41:03.394349	f	::1	\N
418	password-reset	2025-09-28 02:41:17.319351	f	::1	\N
419	password-reset	2025-09-28 02:41:26.297729	f	::1	\N
420	admin	2025-09-28 02:42:18.107738	t	::1	\N
421	admin	2025-09-28 02:42:25.835669	t	::1	\N
422	manu	2025-09-28 02:42:36.809144	t	::1	\N
423	2fa	2025-09-28 02:42:40.557606	f	::1	\N
424	admin	2025-09-28 02:43:06.346581	t	::1	\N
425	2fa	2025-09-28 02:43:14.587553	f	::1	\N
426	2fa	2025-09-28 02:44:22.295911	f	::1	\N
427	2fa	2025-09-28 02:44:32.55785	f	::1	\N
428	2fa	2025-09-28 02:44:34.241892	f	::1	\N
429	manu	2025-09-28 02:44:44.468501	t	::1	\N
430	2fa	2025-09-28 02:44:46.356297	f	::1	\N
431	2fa	2025-09-28 02:44:53.176901	f	::1	\N
432	2fa	2025-09-28 02:44:54.16788	f	::1	\N
433	2fa	2025-09-28 02:44:54.804572	f	::1	\N
434	2fa	2025-09-28 02:44:55.3639	f	::1	\N
435	2fa	2025-09-28 02:44:55.669313	f	::1	\N
436	2fa	2025-09-28 02:44:55.868033	f	::1	\N
437	2fa	2025-09-28 02:44:56.051988	f	::1	\N
438	2fa	2025-09-28 02:44:56.242495	f	::1	\N
439	2fa	2025-09-28 02:44:56.396793	f	::1	\N
440	2fa	2025-09-28 02:44:56.566412	f	::1	\N
441	2fa	2025-09-28 02:44:56.749784	f	::1	\N
442	manu	2025-09-28 02:45:02.729611	t	::1	\N
443	2fa	2025-09-28 02:45:05.27577	f	::1	\N
444	2fa	2025-09-28 02:45:06.459266	f	::1	\N
445	password-reset	2025-09-28 02:45:46.180217	f	::1	\N
446	password-reset	2025-09-28 02:46:05.747742	f	::1	\N
447	password-reset	2025-09-28 02:46:15.211354	f	::1	\N
448	password-reset	2025-09-28 02:46:33.441773	f	::1	\N
449	password-reset	2025-09-28 02:47:33.477487	f	::1	\N
450	admin	2025-09-28 02:51:24.353021	t	::1	\N
451	2fa	2025-09-28 02:51:51.648966	f	::1	\N
452	password-reset	2025-09-28 02:53:45.994249	f	::1	\N
453	password-reset	2025-09-28 03:12:43.627374	f	::1	\N
454	admin	2025-09-28 03:15:51.601352	t	::1	\N
455	password-reset	2025-09-28 03:15:59.034657	f	::1	\N
456	admin	2025-09-28 03:17:51.579891	t	::1	\N
457	2fa	2025-09-28 03:17:54.443773	f	::1	\N
458	password-reset	2025-09-28 03:18:17.981701	f	::1	\N
459	password-reset	2025-09-28 03:18:35.201264	f	::1	\N
460	password-reset	2025-09-28 03:18:55.961647	f	::1	\N
461	password-reset	2025-09-28 03:19:08.813205	f	::1	\N
462	manu	2025-09-28 03:19:26.268309	t	::1	\N
463	2fa	2025-09-28 03:19:29.304803	f	::1	\N
464	2fa	2025-09-28 03:19:36.491165	f	::1	\N
465	2fa	2025-09-28 03:19:36.937806	f	::1	\N
466	2fa	2025-09-28 03:19:37.545226	f	::1	\N
467	2fa	2025-09-28 03:19:38.286797	f	::1	\N
468	2fa	2025-09-28 03:19:49.680913	f	::1	\N
469	2fa	2025-09-28 03:19:50.343539	f	::1	\N
470	2fa	2025-09-28 03:19:59.091929	f	::1	\N
471	2fa	2025-09-28 03:20:02.908052	f	::1	\N
472	admin	2025-09-28 03:20:43.82074	f	::1	\N
473	admin	2025-09-28 03:20:43.929149	f	::1	\N
474	admin	2025-09-28 03:22:17.637196	f	::1	\N
475	admin	2025-09-28 03:22:17.744325	f	::1	\N
476	admin	2025-09-28 03:22:20.281264	f	::1	\N
477	admin	2025-09-28 03:22:20.377032	f	::1	\N
478	admin	2025-09-28 03:22:24.425319	f	::1	\N
479	admin	2025-09-28 03:22:24.537767	f	::1	\N
480	admin	2025-09-28 03:27:32.918549	f	::1	\N
481	admin	2025-09-28 03:27:33.026189	f	::1	\N
482	password-reset	2025-09-28 03:27:42.10628	f	::1	\N
483	admin	2025-09-28 03:30:19.879361	f	::1	\N
484	admin	2025-09-28 03:30:19.984743	f	::1	\N
485	manu	2025-09-28 03:30:25.936673	t	::1	\N
486	2fa	2025-09-28 03:30:28.63167	f	::1	\N
487	admin	2025-09-28 03:31:03.401954	t	::1	\N
488	2fa	2025-09-28 03:31:07.425906	f	::1	\N
489	admin	2025-09-28 03:33:01.941561	t	::1	\N
490	2fa	2025-09-28 03:33:05.039584	f	::1	\N
491	2fa	2025-09-28 03:33:26.638767	f	::1	\N
492	2fa	2025-09-28 03:33:27.894315	f	::1	\N
493	2fa	2025-09-28 03:33:28.399552	f	::1	\N
494	2fa	2025-09-28 03:33:28.597313	f	::1	\N
495	2fa	2025-09-28 03:33:28.788821	f	::1	\N
496	2fa	2025-09-28 03:33:28.964104	f	::1	\N
497	2fa	2025-09-28 03:33:29.131903	f	::1	\N
498	2fa	2025-09-28 03:33:29.310734	f	::1	\N
499	2fa	2025-09-28 03:33:29.492074	f	::1	\N
500	2fa	2025-09-28 03:33:29.696219	f	::1	\N
501	2fa	2025-09-28 03:33:29.874074	f	::1	\N
502	2fa	2025-09-28 03:33:30.041974	f	::1	\N
503	2fa	2025-09-28 03:33:30.224521	f	::1	\N
504	2fa	2025-09-28 03:33:30.393624	f	::1	\N
505	2fa	2025-09-28 03:33:30.57116	f	::1	\N
506	2fa	2025-09-28 03:33:30.737338	f	::1	\N
507	2fa	2025-09-28 03:33:30.920994	f	::1	\N
508	manu	2025-09-28 03:33:48.697019	t	::1	\N
509	2fa	2025-09-28 03:33:52.009655	f	::1	\N
510	password-reset	2025-09-28 03:34:10.341772	f	::1	\N
511	admin	2025-09-28 03:41:02.548407	t	::1	\N
512	2fa	2025-09-28 03:41:05.987968	f	::1	\N
513	2fa	2025-09-28 03:41:17.147222	f	::1	\N
514	2fa	2025-09-28 03:41:18.479379	f	::1	\N
515	2fa	2025-09-28 03:41:19.000326	f	::1	\N
516	2fa	2025-09-28 03:41:19.227442	f	::1	\N
517	2fa	2025-09-28 03:41:19.471424	f	::1	\N
518	2fa	2025-09-28 03:41:19.675502	f	::1	\N
519	2fa	2025-09-28 03:41:19.865257	f	::1	\N
520	2fa	2025-09-28 03:41:20.0485	f	::1	\N
521	2fa	2025-09-28 03:41:20.232321	f	::1	\N
522	2fa	2025-09-28 03:41:20.408468	f	::1	\N
523	2fa	2025-09-28 03:41:20.575417	f	::1	\N
524	2fa	2025-09-28 03:41:20.751831	f	::1	\N
525	admin	2025-09-28 03:46:04.735757	t	::1	\N
526	2fa	2025-09-28 03:46:07.784551	f	::1	\N
527	password-reset	2025-09-28 03:46:24.133646	f	::1	\N
528	password-reset	2025-09-28 03:46:55.198357	f	::1	\N
529	password-reset	2025-09-28 03:46:56.00823	f	::1	\N
530	password-reset	2025-09-28 03:46:56.308857	f	::1	\N
531	password-reset	2025-09-28 03:46:56.498901	f	::1	\N
532	password-reset	2025-09-28 03:47:16.842414	f	::1	\N
533	password-reset	2025-09-28 03:47:26.373162	f	::1	\N
534	admin	2025-09-28 04:05:37.24337	t	::1	\N
535	2fa	2025-09-28 04:05:39.630524	f	::1	\N
536	2fa	2025-09-28 04:05:56.25427	f	::1	\N
537	admin	2025-09-28 04:06:05.222276	t	::1	\N
538	2fa	2025-09-28 04:08:24.950306	f	::1	\N
539	supp	2025-09-28 04:08:32.608165	t	::1	\N
540	2fa	2025-09-28 04:08:35.762711	f	::1	\N
541	password-reset	2025-09-28 04:08:49.812624	f	::1	\N
542	password-reset	2025-09-28 04:08:55.238396	f	::1	\N
543	password-reset	2025-09-28 04:08:55.968069	f	::1	\N
544	password-reset	2025-09-28 04:08:56.217007	f	::1	\N
545	password-reset	2025-09-28 04:08:56.386296	f	::1	\N
546	password-reset	2025-09-28 04:08:56.57644	f	::1	\N
547	password-reset	2025-09-28 04:08:56.752953	f	::1	\N
548	password-reset	2025-09-28 04:08:56.95632	f	::1	\N
549	password-reset	2025-09-28 04:08:57.104953	f	::1	\N
550	password-reset	2025-09-28 04:08:57.281268	f	::1	\N
551	password-reset	2025-09-28 04:08:57.463804	f	::1	\N
552	password-reset	2025-09-28 04:08:57.641492	f	::1	\N
553	password-reset	2025-09-28 04:08:57.82416	f	::1	\N
554	password-reset	2025-09-28 04:08:57.983793	f	::1	\N
555	password-reset	2025-09-28 04:08:58.152035	f	::1	\N
556	password-reset	2025-09-28 04:08:58.359381	f	::1	\N
557	password-reset	2025-09-28 04:08:58.533573	f	::1	\N
558	password-reset	2025-09-28 04:08:58.711393	f	::1	\N
559	password-reset	2025-09-28 04:08:58.885226	f	::1	\N
560	password-reset	2025-09-28 04:08:59.063051	f	::1	\N
561	password-reset	2025-09-28 04:08:59.238109	f	::1	\N
562	password-reset	2025-09-28 04:08:59.399152	f	::1	\N
563	password-reset	2025-09-28 04:08:59.597668	f	::1	\N
564	password-reset	2025-09-28 04:09:06.54952	f	::1	\N
565	password-reset	2025-09-28 04:09:06.839252	f	::1	\N
566	password-reset	2025-09-28 04:09:07.03156	f	::1	\N
567	password-reset	2025-09-28 04:09:07.235183	f	::1	\N
568	password-reset	2025-09-28 04:09:07.387902	f	::1	\N
569	password-reset	2025-09-28 04:09:07.555923	f	::1	\N
570	password-reset	2025-09-28 04:09:07.76121	f	::1	\N
571	password-reset	2025-09-28 04:09:07.908312	f	::1	\N
572	password-reset	2025-09-28 04:09:08.085486	f	::1	\N
573	password-reset	2025-09-28 04:09:08.27966	f	::1	\N
574	password-reset	2025-09-28 04:09:08.435799	f	::1	\N
575	password-reset	2025-09-28 04:09:08.604368	f	::1	\N
576	password-reset	2025-09-28 04:09:08.809088	f	::1	\N
577	password-reset	2025-09-28 04:09:08.964959	f	::1	\N
578	password-reset	2025-09-28 04:09:09.147032	f	::1	\N
579	password-reset	2025-09-28 04:09:09.342248	f	::1	\N
580	password-reset	2025-09-28 04:09:09.499415	f	::1	\N
581	password-reset	2025-09-28 04:09:09.683023	f	::1	\N
582	password-reset	2025-09-28 04:09:09.927013	f	::1	\N
583	password-reset	2025-09-28 04:09:10.130612	f	::1	\N
584	password-reset	2025-09-28 04:09:10.32797	f	::1	\N
585	password-reset	2025-09-28 04:09:10.538264	f	::1	\N
586	password-reset	2025-09-28 04:09:10.708925	f	::1	\N
587	password-reset	2025-09-28 04:09:10.877252	f	::1	\N
588	password-reset	2025-09-28 04:09:11.084238	f	::1	\N
589	password-reset	2025-09-28 04:09:11.25862	f	::1	\N
590	password-reset	2025-09-28 04:09:11.442219	f	::1	\N
591	password-reset	2025-09-28 04:09:11.639237	f	::1	\N
592	password-reset	2025-09-28 04:09:11.799897	f	::1	\N
593	password-reset	2025-09-28 04:09:11.992481	f	::1	\N
594	password-reset	2025-09-28 04:09:12.203581	f	::1	\N
595	password-reset	2025-09-28 04:09:12.358827	f	::1	\N
596	password-reset	2025-09-28 04:09:12.535277	f	::1	\N
597	password-reset	2025-09-28 04:09:12.736814	f	::1	\N
598	password-reset	2025-09-28 04:09:12.914163	f	::1	\N
599	password-reset	2025-09-28 04:09:13.082847	f	::1	\N
600	password-reset	2025-09-28 04:09:13.272858	f	::1	\N
601	admin	2025-09-28 04:09:21.1696	t	::1	\N
602	admin	2025-09-28 04:13:16.406153	t	::1	\N
603	2fa	2025-09-28 04:13:19.432034	f	::1	\N
604	2fa	2025-09-28 04:13:29.524653	f	::1	\N
605	password-reset	2025-09-28 04:14:18.936194	f	::1	\N
606	password-reset	2025-09-28 04:14:25.545647	f	::1	\N
607	password-reset	2025-09-28 04:14:26.038031	f	::1	\N
608	supp	2025-09-28 04:14:30.176341	t	::1	\N
609	2fa	2025-09-28 04:14:33.370787	f	::1	\N
610	admin	2025-09-28 04:15:04.004461	t	::1	\N
611	pak	2025-09-28 04:18:45.568159	t	::1	\N
612	2fa	2025-09-28 04:18:50.175173	f	::1	\N
613	2fa	2025-09-28 04:18:51.584856	f	::1	\N
614	2fa	2025-09-28 04:18:52.730137	f	::1	\N
615	2fa	2025-09-28 04:18:53.36664	f	::1	\N
616	2fa	2025-09-28 04:18:53.570998	f	::1	\N
617	2fa	2025-09-28 04:18:53.81408	f	::1	\N
618	2fa	2025-09-28 04:18:54.048185	f	::1	\N
619	2fa	2025-09-28 04:18:54.246567	f	::1	\N
620	2fa	2025-09-28 04:19:08.517576	f	::1	\N
621	2fa	2025-09-28 04:19:11.494442	f	::1	\N
622	2fa	2025-09-28 04:19:12.095849	f	::1	\N
623	2fa	2025-09-28 04:19:12.304202	f	::1	\N
624	2fa	2025-09-28 04:19:12.483196	f	::1	\N
625	2fa	2025-09-28 04:19:12.673444	f	::1	\N
626	2fa	2025-09-28 04:19:12.856619	f	::1	\N
627	2fa	2025-09-28 04:19:13.039292	f	::1	\N
628	2fa	2025-09-28 04:19:13.231717	f	::1	\N
629	2fa	2025-09-28 04:19:13.407002	f	::1	\N
630	2fa	2025-09-28 04:19:13.588377	f	::1	\N
631	2fa	2025-09-28 04:19:13.772922	f	::1	\N
632	2fa	2025-09-28 04:19:13.963122	f	::1	\N
633	2fa	2025-09-28 04:19:22.23066	f	::1	\N
634	2fa	2025-09-28 04:19:31.27333	f	::1	\N
635	2fa	2025-09-28 04:19:38.149145	f	::1	\N
636	2fa	2025-09-28 04:19:50.898889	f	::1	\N
637	2fa	2025-09-28 04:19:51.251572	f	::1	\N
638	2fa	2025-09-28 04:19:51.47214	f	::1	\N
639	2fa	2025-09-28 04:19:51.64874	f	::1	\N
640	2fa	2025-09-28 04:19:54.907503	f	::1	\N
641	2fa	2025-09-28 04:20:03.896899	f	::1	\N
642	2fa	2025-09-28 04:20:09.029348	f	::1	\N
643	2fa	2025-09-28 04:20:17.462436	f	::1	\N
644	2fa	2025-09-28 04:20:17.691302	f	::1	\N
645	2fa	2025-09-28 04:20:17.946978	f	::1	\N
646	2fa	2025-09-28 04:20:18.1461	f	::1	\N
647	2fa	2025-09-28 04:20:18.350592	f	::1	\N
648	2fa	2025-09-28 04:20:18.527692	f	::1	\N
649	2fa	2025-09-28 04:20:18.69635	f	::1	\N
650	2fa	2025-09-28 04:20:18.879437	f	::1	\N
651	2fa	2025-09-28 04:20:19.053713	f	::1	\N
652	2fa	2025-09-28 04:20:19.24466	f	::1	\N
653	2fa	2025-09-28 04:20:19.413365	f	::1	\N
654	2fa	2025-09-28 04:20:19.611373	f	::1	\N
655	2fa	2025-09-28 04:20:19.800887	f	::1	\N
656	2fa	2025-09-28 04:20:19.977805	f	::1	\N
657	2fa	2025-09-28 04:20:20.152299	f	::1	\N
658	2fa	2025-09-28 04:20:20.329732	f	::1	\N
659	admin	2025-09-28 04:39:42.336655	f	::1	\N
660	admin	2025-09-28 04:39:45.555859	f	::1	\N
661	admin	2025-09-28 04:39:51.212674	f	::1	\N
662	admin	2025-09-28 04:39:57.488326	f	::1	\N
663	admin	2025-09-28 04:39:58.784282	f	::1	\N
664	admin	2025-09-28 04:40:38.350738	t	::1	\N
665	admin	2025-09-28 23:42:25.699907	f	::1	\N
666	admin	2025-09-28 23:42:29.294302	f	::1	\N
667	admin	2025-09-28 23:42:30.425178	f	::1	\N
668	admin	2025-09-28 23:42:34.107793	f	::1	\N
669	supp	2025-09-28 23:42:40.966778	f	::1	\N
670	admin	2025-09-28 23:49:58.493912	f	::1	\N
671	admin	2025-09-28 23:50:00.932378	f	::1	\N
672	admin	2025-09-28 23:50:01.751209	f	::1	\N
673	admin	2025-09-28 23:50:02.351588	f	::1	\N
674	admin	2025-09-28 23:50:02.626807	f	::1	\N
675	admin	2025-09-28 23:58:37.477592	t	::1	\N
676	admin	2025-09-28 23:59:08.204578	t	::1	\N
677	retailer	2025-09-29 00:00:25.529093	t	::1	\N
678	2fa	2025-09-29 00:00:44.582507	f	::1	\N
679	2fa	2025-09-29 00:00:45.631053	f	::1	\N
680	2fa	2025-09-29 00:00:46.479984	f	::1	\N
681	supp	2025-09-29 00:01:32.996019	t	::1	\N
682	manu	2025-09-29 00:01:47.465628	t	::1	\N
683	2fa	2025-09-29 00:08:30.223472	f	::1	\N
684	2fa	2025-09-29 00:08:31.106214	f	::1	\N
685	2fa	2025-09-29 00:08:31.937501	f	::1	\N
686	2fa	2025-09-29 00:08:32.457605	f	::1	\N
687	2fa	2025-09-29 00:08:33.944554	f	::1	\N
688	2fa	2025-09-29 00:08:38.170396	f	::1	\N
689	2fa	2025-09-29 00:08:38.996828	f	::1	\N
690	2fa	2025-09-29 00:08:39.488204	f	::1	\N
691	2fa	2025-09-29 00:08:39.688257	f	::1	\N
692	2fa	2025-09-29 00:08:39.866756	f	::1	\N
693	2fa	2025-09-29 00:08:40.36277	f	::1	\N
694	2fa	2025-09-29 00:08:40.594839	f	::1	\N
695	2fa	2025-09-29 00:08:40.772173	f	::1	\N
696	2fa	2025-09-29 00:08:42.34468	f	::1	\N
697	2fa	2025-09-29 00:08:44.095025	f	::1	\N
698	2fa	2025-09-29 00:08:44.304769	f	::1	\N
699	2fa	2025-09-29 00:08:44.51264	f	::1	\N
700	2fa	2025-09-29 00:08:44.840523	f	::1	\N
701	2fa	2025-09-29 00:08:45.09256	f	::1	\N
702	2fa	2025-09-29 00:08:49.869201	f	::1	\N
703	2fa	2025-09-29 00:08:50.444502	f	::1	\N
704	2fa	2025-09-29 00:08:50.697469	f	::1	\N
705	2fa	2025-09-29 00:08:50.875429	f	::1	\N
706	2fa	2025-09-29 00:08:51.038508	f	::1	\N
707	2fa	2025-09-29 00:09:18.92154	f	::1	\N
708	manu	2025-09-29 00:09:23.264444	t	::1	\N
709	2fa	2025-09-29 00:09:48.134622	f	::1	\N
710	2fa	2025-09-29 00:09:49.321385	f	::1	\N
711	manu	2025-09-29 00:09:54.843192	t	::1	\N
712	2fa	2025-09-29 00:10:04.604198	f	::1	\N
713	2fa	2025-09-29 00:10:05.147987	f	::1	\N
714	2fa	2025-09-29 00:10:05.548526	f	::1	\N
715	2fa	2025-09-29 00:10:05.811109	f	::1	\N
716	2fa	2025-09-29 00:10:06.097353	f	::1	\N
717	2fa	2025-09-29 00:10:06.460105	f	::1	\N
718	2fa	2025-09-29 00:10:06.511987	f	::1	\N
719	2fa	2025-09-29 00:10:06.691963	f	::1	\N
720	manu	2025-09-29 00:10:36.123145	t	::1	\N
721	2fa	2025-09-29 00:10:43.988781	f	::1	\N
722	2fa	2025-09-29 00:10:52.052561	f	::1	\N
723	2fa	2025-09-29 00:10:52.64269	f	::1	\N
724	2fa	2025-09-29 00:10:53.125346	f	::1	\N
725	2fa	2025-09-29 00:10:53.324749	f	::1	\N
726	2fa	2025-09-29 00:10:53.494984	f	::1	\N
727	2fa	2025-09-29 00:10:53.668088	f	::1	\N
728	2fa	2025-09-29 00:10:53.838233	f	::1	\N
729	manu	2025-09-29 00:13:17.815045	t	::1	\N
730	2fa	2025-09-29 00:13:23.172811	f	::1	\N
731	2fa	2025-09-29 00:13:24.170239	f	::1	\N
732	2fa	2025-09-29 00:13:38.98713	f	::1	\N
733	2fa	2025-09-29 00:13:39.797009	f	::1	\N
734	2fa	2025-09-29 00:13:40.116167	f	::1	\N
735	2fa	2025-09-29 00:13:40.325436	f	::1	\N
736	2fa	2025-09-29 00:13:40.555386	f	::1	\N
737	2fa	2025-09-29 00:13:40.740942	f	::1	\N
738	2fa	2025-09-29 00:13:41.27568	f	::1	\N
739	2fa	2025-09-29 00:14:06.983674	f	::1	\N
740	2fa	2025-09-29 00:14:07.646379	f	::1	\N
741	2fa	2025-09-29 00:14:07.868746	f	::1	\N
742	2fa	2025-09-29 00:14:08.157757	f	::1	\N
743	2fa	2025-09-29 00:14:08.343897	f	::1	\N
744	2fa	2025-09-29 00:14:08.520838	f	::1	\N
745	admin	2025-09-29 00:14:21.647874	t	::1	\N
746	manu	2025-09-29 00:14:53.00912	t	::1	\N
747	2fa	2025-09-29 00:16:11.490753	f	::1	\N
748	2fa	2025-09-29 00:16:11.824958	f	::1	\N
749	2fa	2025-09-29 00:16:12.100831	f	::1	\N
750	2fa	2025-09-29 00:16:12.287612	f	::1	\N
751	2fa	2025-09-29 00:16:12.465563	f	::1	\N
752	2fa	2025-09-29 00:16:12.644574	f	::1	\N
753	2fa	2025-09-29 00:16:12.806868	f	::1	\N
754	2fa	2025-09-29 00:16:12.992363	f	::1	\N
755	2fa	2025-09-29 00:16:13.223127	f	::1	\N
756	2fa	2025-09-29 00:16:13.415921	f	::1	\N
757	2fa	2025-09-29 00:16:13.585457	f	::1	\N
758	2fa	2025-09-29 00:16:13.75682	f	::1	\N
759	2fa	2025-09-29 00:16:13.934263	f	::1	\N
760	2fa	2025-09-29 00:16:14.128273	f	::1	\N
761	2fa	2025-09-29 00:16:14.306582	f	::1	\N
762	2fa	2025-09-29 00:16:14.484019	f	::1	\N
763	2fa	2025-09-29 00:16:14.648432	f	::1	\N
764	2fa	2025-09-29 00:16:14.818146	f	::1	\N
765	2fa	2025-09-29 00:16:15.033513	f	::1	\N
766	2fa	2025-09-29 00:16:36.498292	f	::1	\N
767	2fa	2025-09-29 00:16:42.447204	f	::1	\N
768	2fa	2025-09-29 00:16:42.829656	f	::1	\N
769	2fa	2025-09-29 00:16:43.020551	f	::1	\N
770	2fa	2025-09-29 00:16:43.192424	f	::1	\N
771	2fa	2025-09-29 00:16:43.378881	f	::1	\N
772	2fa	2025-09-29 00:16:43.541166	f	::1	\N
773	2fa	2025-09-29 00:16:43.726581	f	::1	\N
774	2fa	2025-09-29 00:16:43.897781	f	::1	\N
775	2fa	2025-09-29 00:17:00.315687	f	::1	\N
776	2fa	2025-09-29 00:17:00.570748	f	::1	\N
777	2fa	2025-09-29 00:17:00.755234	f	::1	\N
778	2fa	2025-09-29 00:17:00.911363	f	::1	\N
779	2fa	2025-09-29 00:17:01.090168	f	::1	\N
780	2fa	2025-09-29 00:17:01.276178	f	::1	\N
781	2fa	2025-09-29 00:17:01.481603	f	::1	\N
782	2fa	2025-09-29 00:17:01.646425	f	::1	\N
783	2fa	2025-09-29 00:17:01.862879	f	::1	\N
784	2fa	2025-09-29 00:17:02.004173	f	::1	\N
785	2fa	2025-09-29 00:17:45.467208	f	::1	\N
786	2fa	2025-09-29 00:17:45.932339	f	::1	\N
787	2fa	2025-09-29 00:17:46.14901	f	::1	\N
788	2fa	2025-09-29 00:17:46.673059	f	::1	\N
789	2fa	2025-09-29 00:17:46.913057	f	::1	\N
790	2fa	2025-09-29 00:17:47.096562	f	::1	\N
791	2fa	2025-09-29 00:17:47.280524	f	::1	\N
792	2fa	2025-09-29 00:17:47.466798	f	::1	\N
793	2fa	2025-09-29 00:17:47.685369	f	::1	\N
794	2fa	2025-09-29 00:17:47.869856	f	::1	\N
795	2fa	2025-09-29 00:17:48.038012	f	::1	\N
796	2fa	2025-09-29 00:17:48.241866	f	::1	\N
797	2fa	2025-09-29 00:17:48.419288	f	::1	\N
798	2fa	2025-09-29 00:17:48.59736	f	::1	\N
799	2fa	2025-09-29 00:17:48.790007	f	::1	\N
800	2fa	2025-09-29 00:18:07.560619	f	::1	\N
801	2fa	2025-09-29 00:18:08.217242	f	::1	\N
802	2fa	2025-09-29 00:18:08.426186	f	::1	\N
803	2fa	2025-09-29 00:18:09.70095	f	::1	\N
804	2fa	2025-09-29 00:18:09.911161	f	::1	\N
805	2fa	2025-09-29 00:18:10.127879	f	::1	\N
806	2fa	2025-09-29 00:18:10.332098	f	::1	\N
807	2fa	2025-09-29 00:18:10.528667	f	::1	\N
808	2fa	2025-09-29 00:18:11.344351	f	::1	\N
809	2fa	2025-09-29 00:18:11.528428	f	::1	\N
810	2fa	2025-09-29 00:20:20.228148	f	::1	\N
811	2fa	2025-09-29 00:20:42.683486	f	::1	\N
812	2fa	2025-09-29 00:20:43.234258	f	::1	\N
813	2fa	2025-09-29 00:20:43.71574	f	::1	\N
814	2fa	2025-09-29 00:20:44.245296	f	::1	\N
815	2fa	2025-09-29 00:20:48.431565	f	::1	\N
816	2fa	2025-09-29 00:20:49.528618	f	::1	\N
817	2fa	2025-09-29 00:20:50.409848	f	::1	\N
818	2fa	2025-09-29 00:20:50.975019	f	::1	\N
819	2fa	2025-09-29 00:20:52.007404	f	::1	\N
820	2fa	2025-09-29 00:20:52.65248	f	::1	\N
821	admin	2025-09-29 00:21:44.693466	t	::1	\N
822	manu	2025-09-29 00:22:55.11308	t	::1	\N
823	2fa	2025-09-29 00:23:04.342555	f	::1	\N
824	2fa	2025-09-29 00:23:39.876447	f	::1	\N
825	2fa	2025-09-29 00:23:47.918249	f	::1	\N
826	2fa	2025-09-29 00:24:48.860477	f	::1	\N
827	2fa	2025-09-29 00:25:05.623427	f	::1	\N
828	manu	2025-09-29 00:27:17.324073	t	::1	\N
829	2fa	2025-09-29 00:27:30.117096	f	::1	\N
830	2fa	2025-09-29 00:28:50.532935	f	::1	\N
831	2fa	2025-09-29 00:29:00.780598	f	::1	\N
832	2fa	2025-09-29 00:29:10.24522	f	::1	\N
833	2fa	2025-09-29 00:35:13.025862	f	::1	\N
834	2fa	2025-09-29 00:36:18.667664	f	::1	\N
835	2fa	2025-09-29 00:36:20.728034	f	::1	\N
836	2fa	2025-09-29 00:38:40.973457	f	::1	\N
837	2fa	2025-09-29 00:39:21.498608	f	::1	\N
838	2fa	2025-09-29 00:39:45.571335	f	::1	\N
839	2fa	2025-09-29 00:40:18.191343	f	::1	\N
840	2fa	2025-09-29 00:41:21.749872	f	::1	\N
841	2fa	2025-09-29 00:41:23.136345	f	::1	\N
842	manu	2025-09-29 00:41:28.058449	t	::1	\N
843	2fa	2025-09-29 00:41:34.122965	f	::1	\N
844	manu	2025-09-29 00:44:19.952648	t	::1	\N
845	2fa	2025-09-29 00:44:26.510539	f	::1	\N
846	2fa	2025-09-29 00:45:19.232233	f	::1	\N
847	manu	2025-09-29 01:00:32.394702	t	::1	\N
848	2fa	2025-09-29 01:00:38.985538	f	::1	\N
849	2fa	2025-09-29 01:00:41.366324	f	::1	\N
850	2fa	2025-09-29 01:00:41.581144	f	::1	\N
851	2fa	2025-09-29 01:00:41.766571	f	::1	\N
852	2fa	2025-09-29 01:00:41.959826	f	::1	\N
853	2fa	2025-09-29 01:00:42.154658	f	::1	\N
854	2fa	2025-09-29 01:00:42.345882	f	::1	\N
855	2fa	2025-09-29 01:00:42.53218	f	::1	\N
856	2fa	2025-09-29 01:00:42.7028	f	::1	\N
857	2fa	2025-09-29 01:00:42.867254	f	::1	\N
858	2fa	2025-09-29 01:00:43.052606	f	::1	\N
859	2fa	2025-09-29 01:00:43.238036	f	::1	\N
860	2fa	2025-09-29 01:00:43.401301	f	::1	\N
861	2fa	2025-09-29 01:00:43.588191	f	::1	\N
862	2fa	2025-09-29 01:00:43.765028	f	::1	\N
863	2fa	2025-09-29 01:00:43.952607	f	::1	\N
864	2fa	2025-09-29 01:00:44.147785	f	::1	\N
865	2fa	2025-09-29 01:00:44.299565	f	::1	\N
866	manu	2025-09-29 01:05:22.917331	t	::1	\N
867	2fa	2025-09-29 01:05:33.161738	f	::1	\N
868	2fa	2025-09-29 01:06:08.310418	f	::1	\N
869	2fa	2025-09-29 01:06:08.985229	f	::1	\N
870	2fa	2025-09-29 01:06:09.421993	f	::1	\N
871	manu	2025-09-29 01:11:26.25302	t	::1	\N
872	admin	2025-09-29 01:12:08.628465	t	::1	\N
873	admin	2025-09-29 01:12:41.958167	t	::1	\N
874	manu	2025-09-29 01:13:31.305645	t	::1	\N
875	manu	2025-09-29 01:14:19.967787	t	::1	\N
876	manu	2025-09-29 01:14:57.732133	t	::1	\N
877	manu	2025-09-29 01:15:07.627607	t	::1	\N
878	2fa	2025-09-29 01:15:07.632351	f	::1	\N
879	manu	2025-09-29 01:15:46.285767	t	::1	\N
880	2fa	2025-09-29 01:15:46.288613	f	::1	\N
881	manu	2025-09-29 01:15:59.602451	t	::1	\N
882	2fa	2025-09-29 01:15:59.605342	f	::1	\N
883	manu	2025-09-29 01:16:09.725124	t	::1	\N
884	2fa	2025-09-29 01:16:09.735013	f	::1	\N
885	2fa	2025-09-29 01:18:32.039945	f	::1	\N
886	2fa	2025-09-29 01:20:19.718973	f	::1	\N
887	2fa	2025-09-29 01:21:26.233599	f	::1	\N
888	manu	2025-09-29 01:26:19.837712	t	::1	\N
889	manu	2025-09-29 01:27:37.178161	t	::1	\N
890	admin	2025-09-29 01:28:12.084334	t	::1	\N
891	supp	2025-09-29 01:28:50.449126	t	::1	\N
892	supp	2025-09-29 01:29:46.754113	t	::1	\N
893	supp	2025-09-29 01:32:26.337446	t	::1	\N
894	manu	2025-09-29 01:33:11.4443	f	::1	\N
895	manu	2025-09-29 01:33:36.652187	f	::1	\N
896	manu	2025-09-29 01:36:25.844768	f	::1	\N
897	manu	2025-09-29 01:36:38.648751	f	::1	\N
898	manu	2025-09-29 01:36:54.662415	f	::1	\N
899	manu	2025-09-29 01:37:14.477471	t	::1	\N
900	manu	2025-09-29 01:38:36.978589	t	::1	\N
901	manu	2025-09-29 01:40:24.630231	t	::1	\N
902	manu	2025-09-29 01:40:50.021275	t	::1	\N
903	manu	2025-09-29 01:41:44.271075	t	::1	\N
904	admin	2025-09-29 01:57:31.944832	t	::1	\N
905	admin	2025-09-29 01:57:36.339838	t	::1	\N
906	admin	2025-09-29 01:57:39.672569	t	::1	\N
907	admin	2025-09-29 01:57:49.588938	t	::1	\N
908	admin	2025-09-29 02:00:30.973119	t	::1	\N
909	admin	2025-09-29 02:00:34.356695	t	::1	\N
910	admin	2025-09-29 02:01:01.747737	t	::1	\N
911	admin	2025-09-29 02:02:24.548938	t	::1	\N
912	admin	2025-09-29 02:02:28.260412	t	::1	\N
913	manu	2025-09-29 02:02:33.296281	t	::1	\N
914	admin	2025-09-29 02:02:51.203431	t	::1	\N
915	admin	2025-09-29 02:04:36.696659	t	::1	\N
916	admin	2025-09-29 02:04:48.318634	t	::1	\N
917	manu	2025-09-29 02:04:53.412652	t	::1	\N
918	admin	2025-09-29 02:11:13.277921	f	::1	\N
919	admin	2025-09-29 02:11:16.37482	t	::1	\N
920	admin	2025-09-29 02:12:50.243102	t	::1	\N
921	admin	2025-09-29 02:13:25.345581	t	::1	\N
922	admin	2025-09-29 02:16:06.662007	t	::1	\N
923	admin	2025-09-29 02:28:42.563963	f	::1	\N
924	admin	2025-09-29 02:46:50.642724	f	::1	\N
925	admin	2025-09-29 02:48:07.610318	t	::1	\N
926	manu	2025-09-29 02:49:58.904441	t	::1	\N
927	' or 1=1 --	2025-09-29 02:53:09.832279	f	::1	\N
928	admin ' or 1=1 --	2025-09-29 02:53:22.516352	f	::1	\N
929	admin' or 1=1 --	2025-09-29 02:53:29.468308	f	::1	\N
930	manu	2025-09-29 02:53:51.894473	f	::1	\N
931	manu	2025-09-29 02:53:59.191551	f	::1	\N
932	manu	2025-09-29 02:54:01.51526	f	::1	\N
933	manu	2025-09-29 02:54:08.856165	t	::1	\N
934	manu	2025-09-29 02:54:25.782942	t	::1	\N
935	admin	2025-09-29 02:54:34.692429	t	::1	\N
936	admin	2025-09-29 02:55:47.498627	t	::1	\N
937	manu	2025-09-29 02:56:18.407126	t	::1	\N
938	manu	2025-09-29 02:57:06.580087	t	::1	\N
939	manu	2025-09-29 02:58:03.698457	t	::1	\N
940	manu	2025-09-29 03:00:56.52914	t	::1	\N
941	admin	2025-09-29 03:01:40.63609	t	::1	\N
942	manu	2025-09-29 03:02:00.939307	t	::1	\N
943	manu	2025-09-29 20:34:19.002023	t	::1	\N
944	admin	2025-09-29 20:34:36.468666	t	::1	\N
945	manu	2025-09-29 20:35:06.720351	t	::1	\N
946	supp	2025-09-29 20:36:05.529715	t	::1	\N
947	supp	2025-09-29 20:52:44.420192	t	::1	\N
948	manu	2025-09-29 20:55:57.804919	t	::1	\N
949	supp	2025-09-29 20:56:55.50131	t	::1	\N
950	manu	2025-09-29 21:10:26.83284	t	::1	\N
951	manu	2025-09-29 21:11:55.395829	t	::1	\N
952	supp	2025-09-29 21:16:28.303317	t	::1	\N
953	manu	2025-09-29 21:17:43.73695	t	::1	\N
954	supp	2025-09-29 21:18:32.471958	t	::1	\N
955	supp	2025-09-29 22:28:36.315206	t	::1	\N
956	admin	2025-09-30 04:15:51.811071	t	::1	\N
957	manu	2025-09-30 04:16:07.999284	t	::1	\N
958	supp	2025-09-30 04:30:41.167833	t	::1	\N
959	retailer	2025-09-30 04:31:17.622336	t	::1	\N
960	admin	2025-09-30 04:52:03.590707	t	::1	\N
961	admin	2025-09-30 05:01:47.308153	t	::1	\N
962	admin	2025-09-30 05:03:41.622662	t	::1	\N
963	retailer	2025-09-30 05:04:34.816125	t	::1	\N
964	manu	2025-09-30 05:20:20.587866	t	::1	\N
965	supp	2025-09-30 05:21:52.807612	t	::1	\N
966	manu	2025-09-30 05:23:08.519856	t	::1	\N
967	supp	2025-09-30 05:24:03.764144	t	::1	\N
968	manu	2025-09-30 05:38:10.772584	t	::1	\N
969	admin	2025-09-30 05:40:42.233293	t	::1	\N
970	manu	2025-09-30 05:40:52.687304	t	::1	\N
971	supp	2025-09-30 05:42:11.269675	t	::1	\N
972	manu	2025-09-30 05:56:06.661388	t	::1	\N
973	supp	2025-09-30 05:57:56.859643	t	::1	\N
974	retailer	2025-09-30 05:58:51.604529	t	::1	\N
975	admin	2025-09-30 06:01:22.667441	t	::1	\N
976	manu	2025-09-30 06:02:18.160927	t	::1	\N
977	supp	2025-09-30 06:04:22.705194	t	::1	\N
978	retailer	2025-09-30 06:06:26.927452	t	::1	\N
979	retailer	2025-09-30 06:18:52.391117	t	::1	\N
980	retailer	2025-09-30 06:19:30.711224	t	::1	\N
981	admin	2025-09-30 06:23:58.690674	t	::1	\N
982	admin	2025-10-01 01:53:11.927717	t	::1	\N
983	admin	2025-10-01 02:00:22.27578	t	::1	\N
984	retailer	2025-10-01 02:00:31.609815	t	::1	\N
985	retailer	2025-10-01 02:16:20.375123	t	::1	\N
986	supp	2025-10-01 02:16:28.171356	t	::1	\N
987	admin	2025-10-01 02:16:35.595285	t	::1	\N
988	admin	2025-10-01 02:43:17.364728	t	::1	\N
989	manu	2025-10-01 02:43:32.942973	t	::1	\N
990	supp	2025-10-01 02:45:06.303031	t	::1	\N
991	manu	2025-10-01 02:46:30.914023	t	::1	\N
992	supp	2025-10-01 02:59:49.266788	t	::1	\N
993	manu	2025-10-01 03:05:03.096846	t	::1	\N
994	manu	2025-10-01 03:51:25.394714	t	::1	\N
995	supp	2025-10-01 03:53:39.22315	t	::1	\N
996	retailer	2025-10-01 03:57:30.326939	t	::1	\N
997	admin	2025-10-01 04:01:50.04143	t	::1	\N
998	admin	2025-10-01 04:33:51.719016	t	::1	\N
999	manu	2025-10-01 04:47:46.364644	t	::1	\N
1000	supp	2025-10-01 04:48:51.919238	t	::1	\N
1001	admin	2025-10-01 05:06:09.609869	t	::1	\N
1002	admin	2025-10-01 05:10:12.356573	t	::1	\N
1003	admin	2025-10-01 06:27:37.787949	t	::1	\N
1004	manu	2025-10-01 14:53:11.859853	t	::1	\N
1005	admin	2025-10-02 01:21:26.309017	t	::1	\N
1006	admin	2025-10-02 01:34:27.24251	t	::1	\N
1007	admin	2025-10-02 02:16:20.314751	t	::1	\N
1008	manu	2025-10-02 02:20:50.509517	t	::1	\N
1009	manu	2025-10-02 02:20:56.551639	t	::1	\N
1010	manu	2025-10-02 02:21:00.773057	t	::1	\N
1011	admin	2025-10-02 02:26:39.496735	t	::1	\N
1012	supp	2025-10-02 02:36:50.410261	t	::1	\N
1013	admin	2025-10-02 02:46:12.168734	t	::1	\N
1014	admin	2025-10-02 02:47:07.387721	t	::1	\N
1015	admin	2025-10-02 02:48:34.446021	t	::1	\N
1016	supp	2025-10-02 02:52:33.873626	t	::1	\N
1017	admin	2025-10-02 02:52:41.352601	t	::1	\N
1018	admin	2025-10-02 02:57:11.615634	t	::1	\N
1019	admin	2025-10-02 03:17:15.182054	t	::1	\N
1020	supp	2025-10-02 03:22:13.091974	f	::1	\N
1021	admin	2025-10-02 03:22:16.921691	t	::1	\N
1022	supp	2025-10-02 03:28:41.9276	t	::1	\N
1023	manu	2025-10-02 03:31:17.968614	t	::1	\N
1024	admin	2025-10-02 14:04:22.273687	t	::1	\N
1025	manu	2025-10-02 21:43:32.255941	t	::1	\N
1026	admin	2025-10-02 21:51:29.923669	t	::1	\N
1027	manu	2025-10-02 21:52:36.955381	t	::1	\N
1028	manu	2025-10-02 22:36:22.945057	t	::1	\N
1029	manu	2025-10-02 22:37:50.067467	t	::1	\N
1030	manu	2025-10-03 00:25:17.042772	t	::1	\N
1031	manu	2025-10-03 01:21:42.744226	f	::1	\N
1032	manu	2025-10-03 01:21:46.214383	f	::1	\N
1033	manu	2025-10-03 01:21:50.852109	f	::1	\N
1034	manu	2025-10-03 01:22:37.603492	t	::1	\N
1035	manu	2025-10-03 01:27:04.012019	t	::1	\N
1036	manu	2025-10-03 01:35:46.527376	t	::1	\N
1037	manu	2025-10-03 01:39:41.781401	t	::1	\N
1038	supp	2025-10-03 01:45:28.599584	t	::1	\N
1039	retailer	2025-10-03 01:47:37.252347	t	::1	\N
1040	manu	2025-10-03 01:56:39.953205	t	::1	\N
1041	retailer	2025-10-03 01:58:25.753176	t	::1	\N
1042	supp	2025-10-03 01:58:30.060869	t	::1	\N
1043	retailer	2025-10-03 02:00:09.670796	t	::1	\N
1044	retailer	2025-10-03 02:00:25.165351	t	::1	\N
1045	retailer	2025-10-03 02:10:30.555642	t	::1	\N
1046	manu	2025-10-03 02:12:03.504607	t	::1	\N
1047	manu	2025-10-03 02:12:13.485844	t	::1	\N
1048	retailer	2025-10-03 02:17:13.013085	t	::1	\N
1049	supp	2025-10-03 02:17:20.185771	t	::1	\N
1050	manu	2025-10-03 02:19:53.398955	t	::1	\N
1051	supp	2025-10-03 02:48:13.409787	t	::1	\N
1052	manu	2025-10-03 02:48:42.91972	t	::1	\N
1053	supp	2025-10-03 03:12:41.111038	t	::1	\N
1054	supp	2025-10-04 01:48:33.951123	t	::1	\N
1055	manu	2025-10-04 02:53:23.520079	t	::1	\N
1056	supp	2025-10-04 02:54:21.600168	t	::1	\N
1057	admin	2025-10-04 02:59:53.788575	t	::1	\N
1058	supp	2025-10-04 03:01:09.853481	t	::1	\N
1059	retailer	2025-10-04 03:13:19.185838	t	::1	\N
1060	supp	2025-10-04 03:15:19.821934	t	::1	\N
1061	retailer	2025-10-04 03:15:47.246473	t	::1	\N
1062	supp	2025-10-04 03:16:55.587297	t	::1	\N
1063	retailer	2025-10-04 03:22:31.807647	t	::1	\N
1064	retailer	2025-10-04 03:24:13.928361	t	::1	\N
1065	supp	2025-10-04 03:25:10.972184	t	::1	\N
1066	admin	2025-10-04 03:27:35.308166	t	::1	\N
1067	supp	2025-10-04 03:31:11.336582	t	::1	\N
1068	supp	2025-10-04 03:48:47.532677	t	::1	\N
1069	admin	2025-10-04 03:50:59.060616	t	::1	\N
1070	supp	2025-10-04 03:54:58.727376	t	::1	\N
\.


--
-- TOC entry 5055 (class 0 OID 24724)
-- Dependencies: 235
-- Data for Name: notification_log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notification_log (id, type, recipient, subject, body, status, created_at, sent_at, error) FROM stdin;
.


--
-- TOC entry 5059 (class 0 OID 32855)
-- Dependencies: 239
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_tokens (id, token, email, username, created_at, expires_at, used_at, user_id, used) FROM stdin;
\.


--
-- TOC entry 5041 (class 0 OID 16408)
-- Dependencies: 221
-- Data for Name: product; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product (name, serialnumber, brand, description, image, created_at, updated_at) FROM stdin;
Easysmx x05	A111	Easysmx	\N	\N	2025-09-23 22:01:49.390002+05	\N
Easysmx x05	A112	Easysmx	\N	\N	2025-09-23 22:01:49.390002+05	\N
Rolex 230	A3344	Rolex	\N	\N	2025-09-23 22:01:49.390002+05	\N
Easysmx x05	A1121	Easysmx	\N	\N	2025-09-23 22:01:49.390002+05	\N
Easysmx x05	A212	Easysmx	\N	\N	2025-09-23 22:01:49.390002+05	\N
Easysmx x05	A2121	Easysmx	\N	\N	2025-09-23 22:01:49.390002+05	\N
Easysmx x05	A3211	Easysmx	\N	\N	2025-09-23 22:01:49.390002+05	\N
birkin	a123	harme	\N	\N	2025-09-23 22:01:49.390002+05	\N
birkin	a1231	harme	\N	\N	2025-09-24 01:40:00.052218+05	\N
birkin	a1232	harme	\N	\N	2025-09-24 02:34:58.933946+05	\N
birkin	a12321	harme	\N	\N	2025-09-24 02:38:40.805808+05	\N
birkin	a123221	harme	\N	\N	2025-09-29 00:15:33.716527+05	\N
birkin	a123211	harme	\N	\N	2025-09-29 01:44:34.278021+05	\N
birkin	a1232111	harme	\N	\N	2025-09-29 20:35:32.678605+05	\N
birkin	a12	harme	\N	\N	2025-09-29 20:56:21.03316+05	\N
birkin	a1212	harme	\N	\N	2025-09-29 21:10:44.286981+05	\N
birkin	a111	harme	\N	\N	2025-09-29 21:11:22.581838+05	\N
birkin	1213	harme	\N	\N	2025-09-29 21:12:06.748335+05	\N
Easysmx x05	a1322	Easysmx	\N	\N	2025-09-29 21:15:32.199547+05	\N
Easysmx x05	a121	Easysmx	\N	\N	2025-09-29 21:18:02.162167+05	\N
Easysmx x05	a132	Easysmx	\N	\N	2025-09-30 04:16:26.598901+05	\N
Easysmx x05	a131	Easysmx	\N	\N	2025-09-30 05:20:39.529451+05	\N
Easysmx x05	a23	Easysmx	\N	\N	2025-09-30 05:23:25.883722+05	\N
Easysmx x05	a32	Easysmx	\N	\N	2025-09-30 05:38:27.417182+05	\N
Easysmx x05	a22	Easysmx	\N	\N	2025-09-30 05:41:10.379202+05	\N
Easysmx x05	a112	Easysmx	\N	\N	2025-09-30 05:56:23.561799+05	\N
Easysmx x05	a35	Easysmx	\N	\N	2025-09-30 06:03:16.395158+05	\N
Easysmx x05	a232	Easysmx	\N	\N	2025-10-01 02:44:32.164946+05	\N
Easysmx x05	a322	Easysmx	\N	\N	2025-10-01 02:47:44.808194+05	\N
Easysmx x05	a1211	Easysmx	\N	\N	2025-10-01 02:59:02.328369+05	\N
Easysmx x05	a323	Easysmx	\N	\N	2025-10-01 03:05:29.32547+05	\N
Easysmx x05	a212	Easysmx	\N	\N	2025-10-01 03:11:57.588953+05	\N
Easysmx x05	a243	Easysmx	\N	\N	2025-10-01 03:52:31.391285+05	\N
Easysmx x05	a2321	Easysmx	\N	\N	2025-10-01 04:48:21.694849+05	\N
Easysmx x05	pa11	Easysmx	\N	\N	2025-10-02 22:04:14.284129+05	\N
easysmx	pa111	Easysmx	\N	\N	2025-10-03 01:43:23.546959+05	\N
easysmx	pa12	Easysmx	\N	\N	2025-10-03 01:57:24.299881+05	\N
easysmx	pg-12	Easysmx	\N	\N	2025-10-03 02:12:49.606423+05	\N
easysmx	pg12	Easysmx	\N	\N	2025-10-04 02:53:52.88379+05	\N
\.


--
-- TOC entry 5045 (class 0 OID 16422)
-- Dependencies: 225
-- Data for Name: product_scans; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.product_scans (id, serial_number, username, scan_time, location, is_authentic, is_suspicious, suspicion_reason, user_agent, geo_country, geo_city, ip_address) FROM stdin;
20	A1341	anonymous	2025-05-25 00:16:13.820198	scan location	f	f	\N	\N	\N	\N	\N
21	A111	anonymous	2025-05-25 00:18:53.417774	scan location	t	f	\N	\N	\N	\N	\N
22	A111	anonymous	2025-05-25 00:31:16.319395	scan location	t	f	\N	\N	\N	\N	\N
23	A112	anonymous	2025-05-25 02:06:11.422536	scan location	t	f	\N	\N	\N	\N	\N
24	A111	anonymous	2025-05-25 02:07:15.522413	scan location	t	f	\N	\N	\N	\N	\N
25	A1341	anonymous	2025-05-25 02:14:12.169091	scan location	f	f	\N	\N	\N	\N	\N
26	A3344	anonymous	2025-05-26 01:18:42.211523	scan location	t	f	\N	\N	\N	\N	\N
27	\N	anonymous	2025-05-26 01:19:33.163377	scan location	f	f	\N	\N	\N	\N	\N
28	A3344	anonymous	2025-05-26 01:19:48.826094	scan location	t	f	\N	\N	\N	\N	\N
29	A212	anonymous	2025-05-26 07:55:25.164432	scan location	t	f	\N	\N	\N	\N	\N
30	\N	anonymous	2025-05-26 07:55:37.656526	scan location	f	f	\N	\N	\N	\N	\N
31	A2121	anonymous	2025-05-26 08:12:23.664541	scan location	t	f	\N	\N	\N	\N	\N
32	\N	anonymous	2025-05-26 08:12:54.945843	scan location	f	f	\N	\N	\N	\N	\N
33	A2121	anonymous	2025-05-26 08:28:31.963918	scan location	t	f	\N	\N	\N	\N	\N
34	A3211	anonymous	2025-05-26 08:43:02.73102	scan location	t	f	\N	\N	\N	\N	\N
35	\N	anonymous	2025-05-26 08:43:20.319098	scan location	f	f	\N	\N	\N	\N	\N
36	a123	anonymous	2025-09-23 05:22:40.152544	scan location	t	f	\N	\N	\N	\N	\N
37	\N	anonymous	2025-09-23 05:23:38.888682	scan location	f	f	\N	\N	\N	\N	\N
38	\N	anonymous	2025-09-26 03:28:38.985122	scan location	f	t	Product marked as not authentic	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
39	a1232111	anonymous	2025-09-29 20:52:05.544836	\N	f	t	QR code does not match expected format or contract address	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
40	a1232111	anonymous	2025-09-29 20:52:28.32858	\N	f	t	QR code does not match expected format or contract address	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
41	\N	anonymous	2025-09-29 21:06:13.680692	scan location	f	t	Product marked as not authentic	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
42	\N	anonymous	2025-09-29 21:08:02.504934	scan location	f	t	Product marked as not authentic	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
43	\N	anonymous	2025-09-29 21:08:15.566152	scan location	f	t	Product marked as not authentic	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
44	\N	anonymous	2025-09-29 21:09:20.606106	scan location	f	t	Product marked as not authentic	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
45	a132	supp	2025-09-30 04:30:45.602952	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
46	a132	retailer	2025-09-30 04:38:17.041033	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
47	a132	retailer	2025-09-30 04:40:31.521051	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
48	a132	retailer	2025-09-30 04:51:29.322764	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
49	a132	admin	2025-09-30 05:01:20.579036	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
50	a132	admin	2025-09-30 05:02:35.982115	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
51	a132	admin	2025-09-30 05:03:32.318067	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
52	a132	retailer	2025-09-30 05:04:40.880574	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
53	a132	supp	2025-09-30 05:22:14.46227	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
54	a22	supp	2025-09-30 05:42:17.192945	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
55	a112	supp	2025-09-30 05:58:01.103667	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
56	a112	retailer	2025-09-30 05:58:57.125213	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
57	a112	retailer	2025-09-30 06:00:06.503647	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
58	a35	supp	2025-09-30 06:05:47.680594	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
59	a35	retailer	2025-09-30 06:12:34.807596	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
60	a35	retailer	2025-09-30 06:16:32.229369	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
61	a112	retailer	2025-09-30 06:22:18.807376	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
62	a112	retailer	2025-09-30 06:23:34.02921	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
63	a112	admin	2025-09-30 06:24:14.143068	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
64	a232	supp	2025-10-01 02:45:12.767397	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
65	a1211	supp	2025-10-01 02:59:55.699746	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
66	a243	supp	2025-10-01 03:53:46.445128	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
67	a243	retailer	2025-10-01 03:57:43.27091	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
68	a243	admin	2025-10-01 04:04:35.429081	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	::1
69	a2321	supp	2025-10-01 04:49:01.652562	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	\N	\N	127.0.0.1
70	a2321	manu	2025-10-01 15:34:06.666202	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
71	a243	manu	2025-10-01 15:34:41.135989	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
72	pa11	supp	2025-10-03 01:46:30.791243	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
73	pa11	retailer	2025-10-03 01:47:48.316825	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
74	pa12	supp	2025-10-03 01:59:24.398118	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
75	pa12	retailer	2025-10-03 02:10:38.558272	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
76	pg-12	supp	2025-10-03 02:18:37.341657	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
77	pa12	supp	2025-10-04 02:41:04.734095	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
78	pa12	supp	2025-10-04 02:52:27.038994	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
79	pg12	supp	2025-10-04 02:54:32.458024	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
80	pg12	supp	2025-10-04 02:56:26.267882	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
81	pg12	supp	2025-10-04 02:57:29.240146	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
82	pg12	supp	2025-10-04 03:07:10.218148	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
83	a123221	supp	2025-10-04 03:07:58.014533	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
84	pg12	supp	2025-10-04 03:10:03.759249	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
85	pg12	retailer	2025-10-04 03:14:09.958826	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
86	pg12	retailer	2025-10-04 03:14:52.297148	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
87	pg12	supp	2025-10-04 03:15:26.060379	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
88	pg12	retailer	2025-10-04 03:23:07.919662	\N	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
89	pg12	supp	2025-10-04 03:49:22.360551	Chak Shahzad, Islamabad, Pakistan	t	f	\N	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0	Local/Test Environment	Internal Network	127.0.0.1
\.


--
-- TOC entry 5040 (class 0 OID 16397)
-- Dependencies: 220
-- Data for Name: profile; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.profile (name, description, username, website, location, image, role, id, updated_at) FROM stdin;
CK Supplier	CK supplier supplies a myriad of luxury items and has a long term contract with Chanel, LV, Dior, etc.	supp	www.cksupp.com.my	Lahore	\N	supplier	4	2025-09-23 22:01:49.390002+05
Manu Group	Manu Group is one of the biggest manufacturer company, covering the majority of the luxury industry	manu	www.manu.com.my	Islambad	\N	manufacturer	3	2025-09-23 22:01:49.390002+05
RE retailer	RE retailer is the only authorized retailer to resell certain goods from certain luxury brands only, namely Chloe, Hermes, Chanel and more	retailer	www.reretailer.com.my	Peshawar s	\N	retailer	5	2025-09-23 22:01:49.390002+05
\.


--
-- TOC entry 5053 (class 0 OID 24713)
-- Dependencies: 233
-- Data for Name: support_chats; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.support_chats (id, username, role, message, created_at, conversation_key) FROM stdin;
10	retailer	retailer	hi	2025-09-24 02:51:39.407685+05	\N
11	retailer	retailer	hi	2025-09-24 02:53:03.161089+05	conv:user:retailer
12	manu	manufacturer	hi	2025-09-24 02:53:12.199699+05	conv:user:manu
13	admin	admin	welcome	2025-09-24 02:53:45.798615+05	conv:user:manu
14	manu	manufacturer	dont you worry just	2025-09-24 02:53:55.707957+05	conv:user:manu
15	admin	admin	bili	2025-09-24 02:54:04.870548+05	conv:user:retailer
16	admin	admin	hi	2025-09-24 02:55:27.184866+05	conv:user:retailer
17	retailer	retailer	hi ther	2025-09-24 02:55:45.805655+05	conv:user:retailer
18	manu	manufacturer	hi	2025-09-28 02:42:49.586744+05	conv:user:manu
19	manu	manufacturer	wa	2025-09-28 02:43:22.066371+05	conv:user:manu
20	admin	admin	heloo there	2025-09-28 02:43:49.010183+05	conv:user:manu
21	admin	admin	hello	2025-10-02 02:34:18.558669+05	conv:user:manu
22	admin	admin	hi	2025-10-02 02:34:35.925737+05	conv:user:manu
23	supp	supplier	HI	2025-10-02 02:37:01.480453+05	conv:user:supp
24	admin	admin	welcome	2025-10-02 02:37:18.236489+05	conv:user:supp
25	admin	admin	what can i do for you	2025-10-02 02:37:33.943447+05	conv:user:supp
26	supp	supplier	nothing tnx	2025-10-02 02:37:46.853963+05	conv:user:supp
27	admin	admin	hi	2025-10-02 03:28:15.363793+05	conv:user:supp
28	supp	supplier	welcome	2025-10-02 03:28:56.446454+05	conv:user:supp
\.


--
-- TOC entry 5079 (class 0 OID 0)
-- Dependencies: 226
-- Name: activity_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_log_id_seq', 209, true);


--
-- TOC entry 5080 (class 0 OID 0)
-- Dependencies: 217
-- Name: auth_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.auth_id_seq', 8, true);


--
-- TOC entry 5081 (class 0 OID 0)
-- Dependencies: 236
-- Name: chain_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.chain_events_id_seq', 77, true);


--
-- TOC entry 5082 (class 0 OID 0)
-- Dependencies: 240
-- Name: consumer_ownership_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.consumer_ownership_id_seq', 5, true);


--
-- TOC entry 5083 (class 0 OID 0)
-- Dependencies: 228
-- Name: inventory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_id_seq', 1, false);


--
-- TOC entry 5084 (class 0 OID 0)
-- Dependencies: 230
-- Name: inventory_moves_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.inventory_moves_id_seq', 1, false);


--
-- TOC entry 5085 (class 0 OID 0)
-- Dependencies: 222
-- Name: login_attempts_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.login_attempts_id_seq', 1070, true);


--
-- TOC entry 5086 (class 0 OID 0)
-- Dependencies: 234
-- Name: notification_log_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notification_log_id_seq', 76, true);


--
-- TOC entry 5087 (class 0 OID 0)
-- Dependencies: 238
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.password_reset_tokens_id_seq', 5, true);


--
-- TOC entry 5088 (class 0 OID 0)
-- Dependencies: 224
-- Name: product_scans_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.product_scans_id_seq', 89, true);


--
-- TOC entry 5089 (class 0 OID 0)
-- Dependencies: 219
-- Name: profile_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.profile_id_seq', 6, true);


--
-- TOC entry 5090 (class 0 OID 0)
-- Dependencies: 232
-- Name: support_chats_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.support_chats_id_seq', 28, true);


--
-- TOC entry 4857 (class 2606 OID 16438)
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- TOC entry 4838 (class 2606 OID 16393)
-- Name: auth auth_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth
    ADD CONSTRAINT auth_pkey PRIMARY KEY (id, username);


--
-- TOC entry 4873 (class 2606 OID 24743)
-- Name: chain_events chain_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chain_events
    ADD CONSTRAINT chain_events_pkey PRIMARY KEY (id);


--
-- TOC entry 4887 (class 2606 OID 32912)
-- Name: consumer_ownership consumer_ownership_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.consumer_ownership
    ADD CONSTRAINT consumer_ownership_pkey PRIMARY KEY (id);


--
-- TOC entry 4865 (class 2606 OID 24705)
-- Name: inventory_moves inventory_moves_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_moves
    ADD CONSTRAINT inventory_moves_pkey PRIMARY KEY (id);


--
-- TOC entry 4862 (class 2606 OID 24689)
-- Name: inventory inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_pkey PRIMARY KEY (id);


--
-- TOC entry 4848 (class 2606 OID 16420)
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- TOC entry 4871 (class 2606 OID 24733)
-- Name: notification_log notification_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_log
    ADD CONSTRAINT notification_log_pkey PRIMARY KEY (id);


--
-- TOC entry 4882 (class 2606 OID 32861)
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- TOC entry 4884 (class 2606 OID 33125)
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- TOC entry 4845 (class 2606 OID 16412)
-- Name: product product_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_pkey PRIMARY KEY (serialnumber);


--
-- TOC entry 4855 (class 2606 OID 16428)
-- Name: product_scans product_scans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.product_scans
    ADD CONSTRAINT product_scans_pkey PRIMARY KEY (id);


--
-- TOC entry 4842 (class 2606 OID 16404)
-- Name: profile profile_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.profile
    ADD CONSTRAINT profile_pkey PRIMARY KEY (id);


--
-- TOC entry 4869 (class 2606 OID 24721)
-- Name: support_chats support_chats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.support_chats
    ADD CONSTRAINT support_chats_pkey PRIMARY KEY (id);


--
-- TOC entry 4836 (class 1259 OID 24666)
-- Name: auth_email_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX auth_email_unique ON public.auth USING btree (email) WHERE (email IS NOT NULL);


--
-- TOC entry 4858 (class 1259 OID 24679)
-- Name: idx_activity_log_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_log_time ON public.activity_log USING btree (log_time DESC);


--
-- TOC entry 4874 (class 1259 OID 24746)
-- Name: idx_chain_events_event_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chain_events_event_time ON public.chain_events USING btree (event_name, created_at DESC);


--
-- TOC entry 4875 (class 1259 OID 32963)
-- Name: idx_chain_events_serial_block; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chain_events_serial_block ON public.chain_events USING btree (serial_number, block_number, log_index);


--
-- TOC entry 4876 (class 1259 OID 24745)
-- Name: idx_chain_events_serial_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chain_events_serial_time ON public.chain_events USING btree (serial_number, created_at DESC);


--
-- TOC entry 4888 (class 1259 OID 32946)
-- Name: idx_consumer_ownership_serial_acquired; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_consumer_ownership_serial_acquired ON public.consumer_ownership USING btree (serial_number, acquired_at);


--
-- TOC entry 4889 (class 1259 OID 32913)
-- Name: idx_consumer_ownership_serial_transferred; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_consumer_ownership_serial_transferred ON public.consumer_ownership USING btree (serial_number, transferred_at);


--
-- TOC entry 4863 (class 1259 OID 24711)
-- Name: idx_inventory_moves_serial_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_moves_serial_time ON public.inventory_moves USING btree (serial_number, moved_at DESC);


--
-- TOC entry 4859 (class 1259 OID 24696)
-- Name: idx_inventory_owner; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_owner ON public.inventory USING btree (owner_role, owner_username);


--
-- TOC entry 4860 (class 1259 OID 24695)
-- Name: idx_inventory_serial; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_serial ON public.inventory USING btree (serial_number);


--
-- TOC entry 4846 (class 1259 OID 24678)
-- Name: idx_login_attempts_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_login_attempts_time ON public.login_attempts USING btree (attempt_time DESC);


--
-- TOC entry 4878 (class 1259 OID 32864)
-- Name: idx_password_reset_tokens_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_tokens_email ON public.password_reset_tokens USING btree (email);


--
-- TOC entry 4879 (class 1259 OID 32865)
-- Name: idx_password_reset_tokens_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_tokens_expires_at ON public.password_reset_tokens USING btree (expires_at);


--
-- TOC entry 4880 (class 1259 OID 32867)
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- TOC entry 4849 (class 1259 OID 33091)
-- Name: idx_product_scans_geo_country_city; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_scans_geo_country_city ON public.product_scans USING btree (geo_country, geo_city, scan_time);


--
-- TOC entry 4850 (class 1259 OID 32942)
-- Name: idx_product_scans_serial_ip_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_scans_serial_ip_time ON public.product_scans USING btree (serial_number, ip_address, scan_time);


--
-- TOC entry 4851 (class 1259 OID 32941)
-- Name: idx_product_scans_serial_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_product_scans_serial_time ON public.product_scans USING btree (serial_number, scan_time);


--
-- TOC entry 4840 (class 1259 OID 24669)
-- Name: idx_profile_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_profile_role ON public.profile USING btree (role);


--
-- TOC entry 4852 (class 1259 OID 24677)
-- Name: idx_scans_ip_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scans_ip_time ON public.product_scans USING btree (ip_address, scan_time DESC);


--
-- TOC entry 4853 (class 1259 OID 24676)
-- Name: idx_scans_serial_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scans_serial_time ON public.product_scans USING btree (serial_number, scan_time DESC);


--
-- TOC entry 4866 (class 1259 OID 24747)
-- Name: idx_support_chats_conversation_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_chats_conversation_key ON public.support_chats USING btree (conversation_key);


--
-- TOC entry 4867 (class 1259 OID 24722)
-- Name: idx_support_chats_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_support_chats_time ON public.support_chats USING btree (created_at DESC);


--
-- TOC entry 4843 (class 1259 OID 24667)
-- Name: profile_username_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX profile_username_unique ON public.profile USING btree (username);


--
-- TOC entry 4877 (class 1259 OID 32964)
-- Name: uq_chain_events_tx_log; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_chain_events_tx_log ON public.chain_events USING btree (tx_hash, log_index);


--
-- TOC entry 4885 (class 1259 OID 33126)
-- Name: uq_password_reset_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- TOC entry 4839 (class 1259 OID 16395)
-- Name: username_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX username_id ON public.auth USING btree (username);


--
-- TOC entry 4891 (class 2606 OID 24706)
-- Name: inventory_moves inventory_moves_serial_number_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_moves
    ADD CONSTRAINT inventory_moves_serial_number_fkey FOREIGN KEY (serial_number) REFERENCES public.product(serialnumber) ON DELETE CASCADE;


--
-- TOC entry 4890 (class 2606 OID 24690)
-- Name: inventory inventory_serial_number_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory
    ADD CONSTRAINT inventory_serial_number_fkey FOREIGN KEY (serial_number) REFERENCES public.product(serialnumber) ON DELETE CASCADE;


-- Completed on 2025-10-04 03:58:54

--
-- PostgreSQL database dump complete
--

