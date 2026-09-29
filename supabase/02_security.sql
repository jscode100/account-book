-- [2단계] 보안 규칙(RLS) 교체 — 반드시 01_backup.sql 을 먼저 실행한 뒤에!
-- 데이터 자체는 바꾸지 않고, "누가 무엇을 볼 수 있는지" 규칙만 바꿉니다.
--
-- 지금: 로그인한 사람이면 누구나 모든 데이터를 보고/고치고/지울 수 있음
-- 변경 후: 같은 가계부에 연결된 사람만 그 가계부 데이터에 접근
--          카테고리·가계부·사용자 삭제는 앱에서 불가능 (실수·악용으로 대량 삭제 방지)

begin;

-- 내가 속한 가계부 번호를 알려주는 도우미
create or replace function public.my_household_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select household_id from public.users where id = auth.uid() limit 1
$$;

-- 기존의 "누구나 전부 허용" 규칙 제거
drop policy if exists "Enable full access for authenticated users" on public.households;
drop policy if exists "Enable full access for authenticated users" on public.users;
drop policy if exists "Enable full access for authenticated users" on public.categories;
drop policy if exists "Enable full access for authenticated users" on public.transactions;

-- households: 내 가계부만 조회 (생성·수정·삭제 불가)
create policy "household_select" on public.households
  for select to authenticated using (id = public.my_household_id());

-- users: 같은 가계부 사람 조회, 본인 등록만 가능 (수정·삭제 불가)
create policy "users_select" on public.users
  for select to authenticated using (id = auth.uid() or household_id = public.my_household_id());
create policy "users_insert_self" on public.users
  for insert to authenticated with check (id = auth.uid());

-- categories: 내 가계부 것만 조회·추가·수정 (삭제 불가)
create policy "categories_select" on public.categories
  for select to authenticated using (household_id = public.my_household_id());
create policy "categories_insert" on public.categories
  for insert to authenticated with check (household_id = public.my_household_id());
create policy "categories_update" on public.categories
  for update to authenticated using (household_id = public.my_household_id()) with check (household_id = public.my_household_id());

-- transactions: 내 가계부 것만 조회·추가·수정·삭제
create policy "transactions_select" on public.transactions
  for select to authenticated using (household_id = public.my_household_id());
create policy "transactions_insert" on public.transactions
  for insert to authenticated with check (household_id = public.my_household_id());
create policy "transactions_update" on public.transactions
  for update to authenticated using (household_id = public.my_household_id()) with check (household_id = public.my_household_id());
create policy "transactions_delete" on public.transactions
  for delete to authenticated using (household_id = public.my_household_id());

-- 사용자 기록이 지워져도 그 사람이 입력한 내역은 남도록 (기존: 내역까지 같이 삭제)
do $$
declare c text;
begin
  select conname into c from pg_constraint
  where conrelid = 'public.transactions'::regclass and contype = 'f'
    and pg_get_constraintdef(oid) like 'FOREIGN KEY (user_id)%';
  if c is not null then
    execute format('alter table public.transactions drop constraint %I', c);
  end if;
  alter table public.transactions
    add constraint transactions_user_id_fkey foreign key (user_id) references public.users(id) on delete set null;
end $$;

commit;

-- 확인용: 새 규칙 목록
select tablename, policyname, cmd from pg_policies where schemaname = 'public' order by tablename, policyname;
