--
-- PostgreSQL database dump
--

\restrict ncGT89jhnnmmc1vWWuuGv6XsAcDhoGO4l4itX5KhE2PbL2ilAMR0nETqgp5Ja8C

-- Dumped from database version 14.20 (Ubuntu 14.20-0ubuntu0.22.04.1)
-- Dumped by pg_dump version 14.20 (Ubuntu 14.20-0ubuntu0.22.04.1)

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
-- Name: direction_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.direction_type AS ENUM (
    'RX',
    'TX'
);


ALTER TYPE public.direction_type OWNER TO postgres;

--
-- Name: station_layer_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.station_layer_type AS ENUM (
    'core',
    'monitoring',
    'gateways',
    'other'
);


ALTER TYPE public.station_layer_type OWNER TO postgres;

--
-- Name: tap_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.tap_type AS ENUM (
    'PRE',
    'POST'
);


ALTER TYPE public.tap_type OWNER TO postgres;

--
-- Name: cleanup_old_monitoring_data(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_old_monitoring_data() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Metrics
  DELETE FROM metrics_agg_5s
  WHERE bucket_ts < now() - interval '72 hours';

  -- Audio index
  DELETE FROM audio_segments_5s
  WHERE bucket_ts < now() - interval '72 hours';

  -- Knob snapshots
  DELETE FROM knob_snapshots_5s
  WHERE bucket_ts < now() - interval '72 hours';

  -- Knob events
  DELETE FROM knob_events
  WHERE occurred_at < now() - interval '72 hours';

  -- Traces: remove calls fully outside retention
  DELETE FROM traces
  WHERE started_at < now() - interval '72 hours'
    AND (ended_at IS NOT NULL AND ended_at < now() - interval '72 hours');
END;
$$;


ALTER FUNCTION public.cleanup_old_monitoring_data() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audio_segments_5s; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audio_segments_5s (
    id bigint NOT NULL,
    trace_id text NOT NULL,
    station_key text NOT NULL,
    station_group text,
    layer public.station_layer_type,
    direction public.direction_type,
    tap public.tap_type NOT NULL,
    bucket_ts timestamp with time zone NOT NULL,
    bucket_ms integer DEFAULT 5000 NOT NULL,
    sample_rate_hz integer DEFAULT 16000 NOT NULL,
    channels integer DEFAULT 1 NOT NULL,
    format text DEFAULT 'WAV_PCM_S16LE_MONO'::text NOT NULL,
    file_path text NOT NULL,
    file_bytes bigint,
    sha256_hex text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audio_segments_5s_bucket_ms_check CHECK ((bucket_ms = 5000)),
    CONSTRAINT audio_segments_5s_channels_check CHECK ((channels = 1))
);


ALTER TABLE public.audio_segments_5s OWNER TO postgres;

--
-- Name: audio_segments_5s_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audio_segments_5s_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.audio_segments_5s_id_seq OWNER TO postgres;

--
-- Name: audio_segments_5s_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audio_segments_5s_id_seq OWNED BY public.audio_segments_5s.id;


--
-- Name: knob_events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knob_events (
    id bigint NOT NULL,
    trace_id text,
    station_key text NOT NULL,
    knob_key text NOT NULL,
    old_value text,
    new_value text NOT NULL,
    source text NOT NULL,
    reason text,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.knob_events OWNER TO postgres;

--
-- Name: knob_events_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knob_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.knob_events_id_seq OWNER TO postgres;

--
-- Name: knob_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knob_events_id_seq OWNED BY public.knob_events.id;


--
-- Name: knob_snapshots_5s; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knob_snapshots_5s (
    id bigint NOT NULL,
    trace_id text NOT NULL,
    station_key text NOT NULL,
    bucket_ts timestamp with time zone NOT NULL,
    bucket_ms integer DEFAULT 5000 NOT NULL,
    knobs_json jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT knob_snapshots_5s_bucket_ms_check CHECK ((bucket_ms = 5000))
);


ALTER TABLE public.knob_snapshots_5s OWNER TO postgres;

--
-- Name: knob_snapshots_5s_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knob_snapshots_5s_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.knob_snapshots_5s_id_seq OWNER TO postgres;

--
-- Name: knob_snapshots_5s_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knob_snapshots_5s_id_seq OWNED BY public.knob_snapshots_5s.id;


--
-- Name: metrics_agg_5s; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.metrics_agg_5s (
    id bigint NOT NULL,
    trace_id text NOT NULL,
    station_key text NOT NULL,
    station_group text,
    layer public.station_layer_type,
    direction public.direction_type,
    tap public.tap_type NOT NULL,
    metric_key text NOT NULL,
    bucket_ts timestamp with time zone NOT NULL,
    bucket_ms integer DEFAULT 5000 NOT NULL,
    count integer NOT NULL,
    min double precision,
    max double precision,
    sum double precision,
    avg double precision,
    last double precision,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT metrics_agg_5s_bucket_ms_check CHECK ((bucket_ms = 5000))
);


ALTER TABLE public.metrics_agg_5s OWNER TO postgres;

--
-- Name: metrics_agg_5s_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.metrics_agg_5s_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.metrics_agg_5s_id_seq OWNER TO postgres;

--
-- Name: metrics_agg_5s_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.metrics_agg_5s_id_seq OWNED BY public.metrics_agg_5s.id;


--
-- Name: traces; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.traces (
    trace_id text NOT NULL,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    src_extension text,
    dst_extension text,
    call_id text,
    notes text,
    sample_rate integer DEFAULT 16000,
    channels integer DEFAULT 1
);


ALTER TABLE public.traces OWNER TO postgres;

--
-- Name: audio_segments_5s id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audio_segments_5s ALTER COLUMN id SET DEFAULT nextval('public.audio_segments_5s_id_seq'::regclass);


--
-- Name: knob_events id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knob_events ALTER COLUMN id SET DEFAULT nextval('public.knob_events_id_seq'::regclass);


--
-- Name: knob_snapshots_5s id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knob_snapshots_5s ALTER COLUMN id SET DEFAULT nextval('public.knob_snapshots_5s_id_seq'::regclass);


--
-- Name: metrics_agg_5s id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metrics_agg_5s ALTER COLUMN id SET DEFAULT nextval('public.metrics_agg_5s_id_seq'::regclass);


--
-- Name: audio_segments_5s audio_segments_5s_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audio_segments_5s
    ADD CONSTRAINT audio_segments_5s_pkey PRIMARY KEY (id);


--
-- Name: knob_events knob_events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knob_events
    ADD CONSTRAINT knob_events_pkey PRIMARY KEY (id);


--
-- Name: knob_snapshots_5s knob_snapshots_5s_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knob_snapshots_5s
    ADD CONSTRAINT knob_snapshots_5s_pkey PRIMARY KEY (id);


--
-- Name: metrics_agg_5s metrics_agg_5s_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metrics_agg_5s
    ADD CONSTRAINT metrics_agg_5s_pkey PRIMARY KEY (id);


--
-- Name: traces traces_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.traces
    ADD CONSTRAINT traces_pkey PRIMARY KEY (trace_id);


--
-- Name: audio_segments_5s_station_tap_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audio_segments_5s_station_tap_idx ON public.audio_segments_5s USING btree (station_key, tap, bucket_ts);


--
-- Name: audio_segments_5s_trace_bucket_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX audio_segments_5s_trace_bucket_idx ON public.audio_segments_5s USING btree (trace_id, bucket_ts);


--
-- Name: audio_segments_5s_uq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX audio_segments_5s_uq ON public.audio_segments_5s USING btree (trace_id, station_key, tap, bucket_ts);


--
-- Name: knob_events_station_time_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX knob_events_station_time_idx ON public.knob_events USING btree (station_key, occurred_at);


--
-- Name: knob_events_trace_time_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX knob_events_trace_time_idx ON public.knob_events USING btree (trace_id, occurred_at);


--
-- Name: knob_snapshots_5s_trace_bucket_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX knob_snapshots_5s_trace_bucket_idx ON public.knob_snapshots_5s USING btree (trace_id, bucket_ts);


--
-- Name: knob_snapshots_5s_uq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX knob_snapshots_5s_uq ON public.knob_snapshots_5s USING btree (trace_id, station_key, bucket_ts);


--
-- Name: metrics_agg_5s_station_metric_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX metrics_agg_5s_station_metric_idx ON public.metrics_agg_5s USING btree (station_key, metric_key, bucket_ts);


--
-- Name: metrics_agg_5s_trace_bucket_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX metrics_agg_5s_trace_bucket_idx ON public.metrics_agg_5s USING btree (trace_id, bucket_ts);


--
-- Name: metrics_agg_5s_uq; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX metrics_agg_5s_uq ON public.metrics_agg_5s USING btree (trace_id, station_key, tap, metric_key, bucket_ts);


--
-- Name: traces_started_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX traces_started_at_idx ON public.traces USING btree (started_at);


--
-- Name: audio_segments_5s audio_segments_5s_trace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audio_segments_5s
    ADD CONSTRAINT audio_segments_5s_trace_id_fkey FOREIGN KEY (trace_id) REFERENCES public.traces(trace_id) ON DELETE CASCADE;


--
-- Name: knob_events knob_events_trace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knob_events
    ADD CONSTRAINT knob_events_trace_id_fkey FOREIGN KEY (trace_id) REFERENCES public.traces(trace_id) ON DELETE CASCADE;


--
-- Name: knob_snapshots_5s knob_snapshots_5s_trace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knob_snapshots_5s
    ADD CONSTRAINT knob_snapshots_5s_trace_id_fkey FOREIGN KEY (trace_id) REFERENCES public.traces(trace_id) ON DELETE CASCADE;


--
-- Name: metrics_agg_5s metrics_agg_5s_trace_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.metrics_agg_5s
    ADD CONSTRAINT metrics_agg_5s_trace_id_fkey FOREIGN KEY (trace_id) REFERENCES public.traces(trace_id) ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

GRANT ALL ON SCHEMA public TO monitoring_user;


--
-- Name: TABLE audio_segments_5s; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.audio_segments_5s TO monitoring_user;


--
-- Name: SEQUENCE audio_segments_5s_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.audio_segments_5s_id_seq TO monitoring_user;


--
-- Name: TABLE knob_events; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.knob_events TO monitoring_user;


--
-- Name: SEQUENCE knob_events_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.knob_events_id_seq TO monitoring_user;


--
-- Name: TABLE knob_snapshots_5s; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.knob_snapshots_5s TO monitoring_user;


--
-- Name: SEQUENCE knob_snapshots_5s_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.knob_snapshots_5s_id_seq TO monitoring_user;


--
-- Name: TABLE metrics_agg_5s; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.metrics_agg_5s TO monitoring_user;


--
-- Name: SEQUENCE metrics_agg_5s_id_seq; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE public.metrics_agg_5s_id_seq TO monitoring_user;


--
-- Name: TABLE traces; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE public.traces TO monitoring_user;


--
-- PostgreSQL database dump complete
--

\unrestrict ncGT89jhnnmmc1vWWuuGv6XsAcDhoGO4l4itX5KhE2PbL2ilAMR0nETqgp5Ja8C

