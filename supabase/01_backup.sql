-- [1단계] DB 안에 백업 복사본 만들기 (기존 데이터는 건드리지 않음)
-- Supabase > SQL Editor 에 통째로 붙여넣고 Run.
-- backup 이라는 별도 공간(스키마)에 복사하므로 앱이나 외부에서는 보이지 않습니다.

create schema if not exists backup;
revoke all on schema backup from anon, authenticated;

create table backup.households_20260929   as table public.households;
create table backup.users_20260929        as table public.users;
create table backup.categories_20260929   as table public.categories;
create table backup.transactions_20260929 as table public.transactions;

-- 원본과 백업의 건수가 똑같은지 확인 (각 줄의 두 숫자가 같아야 정상)
select 'households' as 테이블, (select count(*) from public.households) as 원본, (select count(*) from backup.households_20260929) as 백업
union all select 'users', (select count(*) from public.users), (select count(*) from backup.users_20260929)
union all select 'categories', (select count(*) from public.categories), (select count(*) from backup.categories_20260929)
union all select 'transactions', (select count(*) from public.transactions), (select count(*) from backup.transactions_20260929);
