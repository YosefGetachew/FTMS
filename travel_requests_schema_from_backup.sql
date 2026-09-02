--
-- PostgreSQL database dump
--

\restrict 4xcAVQUCvOqqu4jL9iS63BTUJiRytS4VrKGc1UY84rc7UOSC1RAgz7kmRXtLqin

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
-- Name: travel_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.travel_requests (
    id integer NOT NULL,
    full_name character varying(255),
    "position" character varying(255),
    department character varying(255),
    country character varying(255),
    start_date date,
    end_date date,
    purpose text,
    sponsor character varying(255),
    passport_number character varying(255),
    email character varying(255),
    phone character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) DEFAULT 'Pending'::character varying
);


ALTER TABLE public.travel_requests OWNER TO postgres;

--
-- PostgreSQL database dump complete
--

\unrestrict 4xcAVQUCvOqqu4jL9iS63BTUJiRytS4VrKGc1UY84rc7UOSC1RAgz7kmRXtLqin

