--
-- PostgreSQL database dump
--

\restrict RlEOkEz4b5d3cfJY7fnlWl4b7DL2x3GE4ecAscrFqS51xTPWblxGGHZOGPdkj8J

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

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
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    full_name character varying(255),
    email character varying(255),
    password character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    role character varying(50) DEFAULT 'data_entry'::character varying,
    is_active boolean DEFAULT true,
    sector character varying(255)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- PostgreSQL database dump complete
--

\unrestrict RlEOkEz4b5d3cfJY7fnlWl4b7DL2x3GE4ecAscrFqS51xTPWblxGGHZOGPdkj8J

