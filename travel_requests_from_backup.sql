--
-- PostgreSQL database dump
--

\restrict gavDduD9GJPNwow1RjVohuoYNmVQYhh7AnIelnFSeeSjbi1xILcfy83G9HcDPls

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

--
-- Data for Name: travel_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.travel_requests (id, full_name, "position", department, country, start_date, end_date, purpose, sponsor, passport_number, email, phone, created_at, status) FROM stdin;
2	አባቴነህ 	state minister	livestock	china	2026-05-15	2026-05-29	fva	undp	1234			2026-05-12 17:44:54.668704	Pending
4	hgdmdg	hgfmd	dyng	dyndsx	2026-05-21	2026-06-02	nmfgndxfgndxfgn	giz	dfbs	kkladnkalnkal@gmail.com	0911702373	2026-05-13 10:48:07.491016	Approved
3	asdva	adva	sdva	sdva	2026-05-22	2026-05-22	dva	erva	vae			2026-05-12 17:47:21.603508	Rejected
5	fdl;amkd	fgns	sgfbs	sfdb	2026-05-15	2026-05-29	fgnbsfgnbs	un	er444	kjadb@gmail.com	0911702373	2026-05-13 11:45:13.58893	Pending
6	Dr. Mandefro	GD	abcd	US	2026-05-30	2026-06-06	exp shar	UNDP	325532465	jmdsnvkj@gmail.com	0911727272	2026-05-13 14:53:20.705163	Approved
7	aaaaaaaaaa	hhh	ghngd	Canada	2026-06-03	2026-06-25	ለጉብኝትና ለስራ	un	124	kjds@gmail.com		2026-05-13 14:57:25.568506	Approved
\.


--
-- PostgreSQL database dump complete
--

\unrestrict gavDduD9GJPNwow1RjVohuoYNmVQYhh7AnIelnFSeeSjbi1xILcfy83G9HcDPls

