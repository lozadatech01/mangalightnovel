-- Accept structured creator credits and scope while retaining historical text revisions.
create or replace function supply_work.check_fields(p_role text, p_fields jsonb, p_submit boolean) returns boolean
language plpgsql immutable security invoker set search_path = ''
as $$
declare
  definitions jsonb := supply_work.field_contract(p_role);
  definition jsonb;
  field_key text;
  field_json jsonb;
  field_text text;
  person jsonb;
begin
  if definitions is null or jsonb_typeof(p_fields) is distinct from 'object' or octet_length(p_fields::text) > 30000 then
    return false;
  end if;
  if exists (select 1 from jsonb_object_keys(p_fields) k(key)
    where not exists (select 1 from jsonb_array_elements(definitions) d where d->>'key' = k.key)) then
    return false;
  end if;
  for definition in select value from jsonb_array_elements(definitions) loop
    field_key := definition->>'key';
    field_json := p_fields->field_key;
    field_text := p_fields->>field_key;
    if field_json is null then
      if p_submit and (definition->>'required')::boolean then return false; end if;
      continue;
    end if;
    if p_role = 'creator' and field_key in ('contributors', 'claimants') and jsonb_typeof(field_json) = 'array' then
      if jsonb_array_length(field_json) not between 1 and 12 then return false; end if;
      if field_json = '[{"applicant":true}]'::jsonb then continue; end if;
      if (select count(distinct lower(value::text)) from jsonb_array_elements(field_json)) <> jsonb_array_length(field_json) then
        return false;
      end if;
      for person in select value from jsonb_array_elements(field_json) loop
        if jsonb_typeof(person) <> 'object' then return false; end if;
        if person - array['first','last','role'] <> '{}'::jsonb
          or jsonb_typeof(person->'first') is distinct from 'string'
          or char_length(btrim(person->>'first')) not between 1 and 80
          or jsonb_typeof(person->'last') is distinct from 'string'
          or char_length(person->>'last') > 80
          or (field_key = 'contributors' and coalesce(person->>'role','') not in ('author','illustrator','translator','adapter'))
          or (field_key = 'claimants' and person ? 'role') then return false; end if;
      end loop;
      continue;
    end if;
    if p_role = 'creator' and field_key = 'requested_scope' and jsonb_typeof(field_json) = 'object' then
      if field_json - array['channel','territory','from','until'] <> '{}'::jsonb
        or field_json->>'channel' is distinct from 'web'
        or coalesce(field_json->>'territory','') not in ('PH','WORLD')
        or exists (select 1 from jsonb_each(field_json) entry where jsonb_typeof(entry.value) <> 'string')
        or (field_json ? 'from' and (field_json->>'from' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or not pg_input_is_valid(field_json->>'from','date')))
        or (field_json ? 'until' and (field_json->>'until' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or not pg_input_is_valid(field_json->>'until','date')))
        or field_json->>'from' >= field_json->>'until' then return false; end if;
      continue;
    end if;
    case definition->>'type'
      when 'choice' then
        if jsonb_typeof(field_json) <> 'string' or not ((definition->'choices') ? field_text) then return false; end if;
      when 'integer' then
        if jsonb_typeof(field_json) <> 'number' or field_text !~ '^[1-9][0-9]{0,8}$' then return false; end if;
      when 'money' then
        if jsonb_typeof(field_json) <> 'number' or field_text !~ '^(0|[1-9][0-9]{0,11})$' then return false; end if;
      when 'date' then
        if jsonb_typeof(field_json) <> 'string' or field_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          or not pg_input_is_valid(field_text, 'date') then return false; end if;
      else
        if jsonb_typeof(field_json) <> 'string' or btrim(field_text) = ''
          or char_length(field_text) > (definition->>'maxLength')::integer then return false; end if;
    end case;
  end loop;
  if p_role = 'licensor' and p_fields->>'valid_from' >= p_fields->>'valid_until' then return false; end if;
  if p_role = 'wholesaler' and (p_fields->>'moq')::integer > (p_fields->>'quantity')::integer then return false; end if;
  return true;
end
$$;
