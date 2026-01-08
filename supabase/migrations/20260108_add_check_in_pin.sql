-- Add check_in_pin column to student_profiles table for PIN-based attendance check-in
ALTER TABLE student_profiles
ADD COLUMN IF NOT EXISTS check_in_pin VARCHAR(6);

-- Create unique index for PINs within each school (same PIN can exist in different schools)
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_profiles_school_pin
ON student_profiles(school_id, check_in_pin)
WHERE check_in_pin IS NOT NULL;

-- Function to generate a unique PIN for a school
CREATE OR REPLACE FUNCTION generate_unique_pin(p_school_id UUID)
RETURNS VARCHAR(6) AS $$
DECLARE
  new_pin VARCHAR(6);
  pin_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate random 6-digit PIN
    new_pin := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

    -- Check if PIN already exists for this school
    SELECT EXISTS(
      SELECT 1 FROM student_profiles
      WHERE school_id = p_school_id AND check_in_pin = new_pin
    ) INTO pin_exists;

    -- Exit loop if PIN is unique
    EXIT WHEN NOT pin_exists;
  END LOOP;

  RETURN new_pin;
END;
$$ LANGUAGE plpgsql;
