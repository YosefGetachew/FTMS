--
-- PostgreSQL database dump
--

\restrict jjoZFfhhveywqcT8kWVVmq1M8cAuJXAjadTIDCZi0MYiFMazLBuT51PEVOrxexp

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
-- Name: requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.requests (
    passport_file text,
    invitation_letter text,
    tor_file text,
    traveler_category text,
    organization_name text,
    full_name text,
    "position" text,
    department text,
    country text,
    start_date date,
    end_date date,
    purpose text,
    sponsor text,
    passport_number text,
    email text,
    phone text,
    status text,
    id integer NOT NULL,
    assigned_state_minister_id integer,
    current_stage character varying(100) DEFAULT 'state_minister'::character varying,
    final_status character varying(50) DEFAULT 'pending'::character varying,
    workflow_comment text,
    amendment_comment text,
    amended_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    workflow_note text,
    sector character varying(255)
);


ALTER TABLE public.requests OWNER TO postgres;

--
-- PostgreSQL database dump complete
--

\unrestrict jjoZFfhhveywqcT8kWVVmq1M8cAuJXAjadTIDCZi0MYiFMazLBuT51PEVOrxexp

