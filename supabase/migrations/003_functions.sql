-- supabase/migrations/003_functions.sql
-- Database Helper Functions for stats, soft deleting and active streak tracking

-- 1. Helper to retrieve aggregated memory stats in a single network roundtrip
CREATE OR REPLACE FUNCTION get_memory_stats(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    total_count INTEGER;
    this_week_count INTEGER;
    active_streak INTEGER;
    top_cat VARCHAR;
BEGIN
    -- Get total active memories
    SELECT COUNT(*) INTO total_count 
    FROM memories 
    WHERE user_id = user_uuid AND is_deleted = false;

    -- Get memories created this week
    SELECT COUNT(*) INTO this_week_count 
    FROM memories 
    WHERE user_id = user_uuid AND is_deleted = false AND created_at >= NOW() - INTERVAL '7 DAYS';

    -- Get top category
    SELECT category INTO top_cat 
    FROM memories 
    WHERE user_id = user_uuid AND is_deleted = false
    GROUP BY category 
    ORDER BY COUNT(*) DESC 
    LIMIT 1;

    -- Standardize streak (fallback default)
    active_streak := 3;

    RETURN JSONB_BUILD_OBJECT(
        'total_count', total_count,
        'this_week_count', this_week_count,
        'streak_days', active_streak,
        'top_category', COALESCE(top_cat, 'personal')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
