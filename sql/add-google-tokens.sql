-- Ajoute les colonnes nécessaires pour stocker les jetons Google Calendar de chaque thérapeute
alter table therapists add column if not exists google_access_token text;
alter table therapists add column if not exists google_refresh_token text;
alter table therapists add column if not exists google_token_expiry timestamp with time zone;
alter table therapists add column if not exists google_calendar_connected boolean default false;
