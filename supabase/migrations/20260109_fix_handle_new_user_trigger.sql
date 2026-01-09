-- Update handle_new_user trigger to include school_id and role from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, school_id, role, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Unknown'),
    (NEW.raw_user_meta_data->>'school_id')::UUID,
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    false -- New users need approval
  )
  ON CONFLICT (id) DO UPDATE SET
    school_id = COALESCE(EXCLUDED.school_id, profiles.school_id),
    role = COALESCE(EXCLUDED.role, profiles.role),
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Profile creation failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
