-- RLS Policies for Class Enrollments and Attendance

-- =============================================
-- CLASS ENROLLMENTS
-- =============================================

-- Students can view their own enrollments
DROP POLICY IF EXISTS "Students can view own enrollments" ON class_enrollments;
CREATE POLICY "Students can view own enrollments" ON class_enrollments FOR SELECT USING (
  student_profile_id IN (
    SELECT id FROM student_profiles WHERE profile_id = auth.uid()
  )
);

-- Owners/Admins can view all enrollments in their school
DROP POLICY IF EXISTS "Owners can view school enrollments" ON class_enrollments;
CREATE POLICY "Owners can view school enrollments" ON class_enrollments FOR SELECT USING (
  class_schedule_id IN (
    SELECT cs.id FROM class_schedules cs
    WHERE cs.school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
);

-- Owners/Admins can manage enrollments
DROP POLICY IF EXISTS "Owners can manage enrollments" ON class_enrollments;
CREATE POLICY "Owners can manage enrollments" ON class_enrollments FOR ALL USING (
  class_schedule_id IN (
    SELECT cs.id FROM class_schedules cs
    WHERE cs.school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
);

-- =============================================
-- CLASS SESSIONS
-- =============================================

-- Members can view sessions for classes in their school
DROP POLICY IF EXISTS "Members can view school class sessions" ON class_sessions;
CREATE POLICY "Members can view school class sessions" ON class_sessions FOR SELECT USING (
  class_schedule_id IN (
    SELECT cs.id FROM class_schedules cs
    WHERE cs.school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- Owners/Admins can manage sessions
DROP POLICY IF EXISTS "Owners can manage class sessions" ON class_sessions;
CREATE POLICY "Owners can manage class sessions" ON class_sessions FOR ALL USING (
  class_schedule_id IN (
    SELECT cs.id FROM class_schedules cs
    WHERE cs.school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
);

-- =============================================
-- ATTENDANCE RECORDS
-- =============================================

-- Students can view their own attendance
DROP POLICY IF EXISTS "Students can view own attendance" ON attendance_records;
CREATE POLICY "Students can view own attendance" ON attendance_records FOR SELECT USING (
  student_profile_id IN (
    SELECT id FROM student_profiles WHERE profile_id = auth.uid()
  )
);

-- Owners/Admins can view all attendance in their school
DROP POLICY IF EXISTS "Owners can view school attendance" ON attendance_records;
CREATE POLICY "Owners can view school attendance" ON attendance_records FOR SELECT USING (
  class_session_id IN (
    SELECT cs.id FROM class_sessions cs
    JOIN class_schedules sch ON cs.class_schedule_id = sch.id
    WHERE sch.school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
);

-- Owners/Admins can manage attendance
DROP POLICY IF EXISTS "Owners can manage attendance" ON attendance_records;
CREATE POLICY "Owners can manage attendance" ON attendance_records FOR ALL USING (
  class_session_id IN (
    SELECT cs.id FROM class_sessions cs
    JOIN class_schedules sch ON cs.class_schedule_id = sch.id
    WHERE sch.school_id IN (
      SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  )
);

-- =============================================
-- STUDENT PROFILES - ensure students can see their own
-- =============================================

DROP POLICY IF EXISTS "Users can view own student profile" ON student_profiles;
CREATE POLICY "Users can view own student profile" ON student_profiles FOR SELECT USING (
  profile_id = auth.uid()
);

DROP POLICY IF EXISTS "Owners can view school student profiles" ON student_profiles;
CREATE POLICY "Owners can view school student profiles" ON student_profiles FOR SELECT USING (
  school_id IN (
    SELECT school_id FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'admin')
  )
);
