--
-- PostgreSQL database dump
--

\restrict flNDgYIkAd3OHMIUj00EJTOeap5A7Fbalntz9bnv9GWnIWGUOG9Qg8rz86PnJlK

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
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, full_name, email, password, created_at, role, is_active, sector) FROM stdin;
59	Yilma	yilma@gmail.com	$2a$10$PxuJFXB58.uP446ViKtWvOy0rYMQfDfiHq04tJrtK9csXpdXirVh6	2026-05-28 19:13:36.109765	Office Head	t	Head of Minister’s Office
37	Dr. Sofia Kassa	sofia@gmail.com	$2a$10$NQ38ugxP5VfT8Pk3RuVGHOmyRehmVFoThQdUXhy/adF39UtF34Sae	2026-05-22 11:30:21.767455	state_minister	t	Agricultural Investment and Input Supply Development
38	Ato Desalegn Teshal	desalegn@gmail.com	$2a$10$iWy3QOzJaZ4Z5puClEOzuOUec/lizmkEmDlkw6PilBSjpmkhpMLeO	2026-05-22 11:31:25.54821	state_minister	t	Agriculture and Horticulture Development
30	admin	yosefgetachew@gmail.com	$2a$10$ChFSjajP71yHpvhBXdra/.aXPOlefHZJjgEzVzyEIcxqRHIZh/lv.	2026-05-22 10:43:34.440801	admin	t	\N
35	Dr. Fikeru Regassa	fikru@gmail.com	$2a$10$PUT01ygvJarAz7F9TK09/.wKFAJFdbqRKecvehoSDHmxMw3zyvDT.	2026-05-22 11:29:14.150838	state_minister	t	Livestock and fish Development Sector
36	Prof. Eyasu Eliyas	eyasu@gmail.com	$2a$10$xqR0sJCwUPzZhUcNGyjpuu79N5y806tlpZOrEYAWSYOEZ1X.9Al1y	2026-05-22 11:29:46.868989	state_minister	t	Natural resource Development Sector
82	Ato Kedir Lubango	kedirceo@gmail.com	$2a$10$1fU9RDOi/yyzR1vZpqvkPeXOnOczdsXCSXL.ZAlh3GztfjHVx1SCO	2026-06-01 14:21:01.922717	chief_executive_officer	t	Chief Executive Office
83	H.E Ato Addisu Arega	adisuminister@gmail.com	$2a$10$rg/5NFomsmyvWHSCDGCzQuL8FxQVj3OvcUeTYVbxpCOXZ2c9nIdgu	2026-06-01 14:54:24.858519	minister	t	Minister
90	kljsdnhvksj	beyeneabateneh@gmail.com	$2a$10$xVJSv9DUI5fT6dgmgR8zVenJ/MtgG8ZRqhDMG.T1IL3i1LpCYIVPK	2026-06-02 14:54:09.492052	traveler	t	\N
81	Ato Yilma	yilmadmg@gmail.com	$2a$10$.3yjk5JvW24GF6fD4uvYWuFvYTs47Css4Z4i3/6h0w1K490yNBZkS	2026-06-01 14:20:15.194049	office_head	t	Head of Minister office
6	Admin	admin@ftms.com	$2a$10$zIqQ1He.Q6ykl.70sq5mX.DaJfPSbIYwcslGU2Vy4S5aGcissHAMW	2026-05-13 13:40:11.054626	admin	t	\N
32	Abateneh	protocol@gmail.com	$2a$10$BRZopvroju67sUmMzWFjSOjVMwVOXAHgdRYvYTUWgKNdwB1r9m.iS	2026-05-22 10:50:36.022663	protocol	t	\N
\.


--
-- PostgreSQL database dump complete
--

\unrestrict flNDgYIkAd3OHMIUj00EJTOeap5A7Fbalntz9bnv9GWnIWGUOG9Qg8rz86PnJlK

