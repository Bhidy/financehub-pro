--
-- PostgreSQL database dump
--

\restrict SNhkSzSVYpbCiyKIEgSrxGn5S7fVEEdYVl9wPTJxQDm8uajleYf0fapfliR1cZt

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

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: home
--

COPY public.users (id, email, hashed_password, full_name, role, is_active, created_at) FROM stdin;
1	myadmin@financehub.pro	$2b$12$XGpirT6vik/dwLfz1fZaGuJ0QX3qMT1n0IRqPOqzBNl3tO2Q8LXhS	Admin User	user	t	2025-12-26 15:15:53.048567+02
2	qa_test_c22d6ed5@financehub.pro	$2b$12$73WF/Wcfnm/zOVgGv97u7e2DSR71MDaJekFxzeguqFbUUNDP.Q40m	QA Automation Bot	user	t	2025-12-26 15:38:05.108308+02
3	browser_test@financehub.pro	$2b$12$EN57/XCsAzOGN.vM6UuyDe2jjK7IjcyfeXUTb/qeX0V7DdqfOnre.	Browser Test User	user	t	2025-12-26 15:42:09.867891+02
4	test_42c4e316-d6be-4937-b709-27dcf56db01f@financehub.pro	$2b$12$7NjALpnz2yxs4a2fBmBnLOTfBZR1ynczu0nZOLx1CqYgIDOepyQwC	Test User	user	t	2025-12-26 16:00:05.725941+02
5	test_b758fdd4-7d78-422d-bfdb-cdbe3e497455@financehub.pro	$2b$12$33UpmiNG1pHmP5aYCDFaN.UVoHejq8w2JxrVQzod9ena3mHUaM3MK	Test User	user	t	2025-12-26 16:28:50.896252+02
6	test_7a4a6509-467d-44e7-88fd-f0aea0187a24@financehub.pro	$2b$12$40VdlHCKT8vdWPtj5..JseOUG2oVWz685g5ckolCNYzIjFsLtoCnC	Test User	user	t	2025-12-26 16:29:34.556103+02
7	test_bd8d4f49-70ee-4c7d-8db5-4530aef02168@financehub.pro	$2b$12$The/HxCMHB7DVFNtospvNeJQTryoJtE14mJWFUAjg3s.ImrxMEJQS	Test User	user	t	2025-12-26 16:44:26.00165+02
\.


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: home
--

SELECT pg_catalog.setval('public.users_id_seq', 7, true);


--
-- PostgreSQL database dump complete
--

\unrestrict SNhkSzSVYpbCiyKIEgSrxGn5S7fVEEdYVl9wPTJxQDm8uajleYf0fapfliR1cZt

