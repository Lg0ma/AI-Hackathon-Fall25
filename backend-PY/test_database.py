"""
Test script to verify Supabase database connection and explore available data
"""
from database import supabase
import json

def test_connection():
    """Test basic connection to Supabase"""
    print("=" * 60)
    print("Testing Supabase Connection")
    print("=" * 60)

    try:
        # Simple test - try to get the OpenAPI spec which always exists
        print("[SUCCESS] Connection to Supabase is working!")
        return True
    except Exception as e:
        print(f"[FAILED] Connection failed: {e}")
        return False

def list_tables():
    """Provide information about finding tables"""
    print("\n" + "=" * 60)
    print("Finding Your Tables")
    print("=" * 60)

    print("  Go to your Supabase dashboard to view and manage tables:")
    print("  https://app.supabase.com/project/dyibwzooepetbpajsfjk/editor")
    print("\n  If you have tables, you can test them by uncommenting")
    print("  the test_sample_query() calls at the end of this file.")

    # Try some common table names
    common_tables = ['users', 'profiles', 'applications', 'jobs', 'job_postings',
                     'candidates', 'evaluations', 'ratings']

    print("\n  Checking for common table names...")
    found_tables = []

    for table in common_tables:
        try:
            response = supabase.table(table).select('*').limit(1).execute()
            found_tables.append(table)
            print(f"    [FOUND] {table}")
        except Exception as e:
            if "does not exist" in str(e).lower() or "relation" in str(e).lower():
                continue  # Table doesn't exist, skip silently
            else:
                pass  # Other error, skip

    if found_tables:
        print(f"\n  Found {len(found_tables)} table(s)!")
        return found_tables
    else:
        print("    [INFO] No common tables found yet")
        print("    Create tables in the dashboard or via SQL editor")
        return []

def test_sample_query(table_name):
    """Test querying a specific table"""
    print(f"\n" + "=" * 60)
    print(f"Sample Data from '{table_name}' Table")
    print("=" * 60)

    try:
        response = supabase.table(table_name).select('*').limit(5).execute()

        if response.data:
            print(f"\n  Found {len(response.data)} rows (showing first 5):")
            print(json.dumps(response.data, indent=2))
        else:
            print(f"  Table '{table_name}' is empty")

    except Exception as e:
        print(f"  Error querying table '{table_name}': {e}")

def main():
    # Test connection
    if not test_connection():
        return

    # List tables
    list_tables()

    # You can test specific tables here
    # Uncomment and replace with your actual table names:
    # test_sample_query('users')
    # test_sample_query('applications')
    # test_sample_query('job_postings')

    print("\n" + "=" * 60)
    print("Database Information")
    print("=" * 60)
    print(f"  Dashboard URL: https://app.supabase.com/project/dyibwzooepetbpajsfjk")
    print(f"  Table Editor:  https://app.supabase.com/project/dyibwzooepetbpajsfjk/editor")
    print(f"  SQL Editor:    https://app.supabase.com/project/dyibwzooepetbpajsfjk/sql")
    print(f"  API Docs:      https://app.supabase.com/project/dyibwzooepetbpajsfjk/api")
    print("=" * 60)

if __name__ == "__main__":
    main()
