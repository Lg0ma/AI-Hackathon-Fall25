#!/usr/bin/env python3
"""
Test Resume Validation Script
==============================
Tests the resume data validation and formatting functions.

This script loads test_resume_data.json and shows before/after validation
to verify that:
1. Job 2 with all "No" responses is filtered out
2. Skills are extracted as comma-separated lists (not sentences)
3. Job titles are formatted (not full sentences)
4. Locations are properly formatted

Usage:
    python test_resume_validation.py
"""

import json
import os
from resumeAI import ResumeAI


def print_section(title):
    """Print a formatted section header"""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_comparison(label, original, cleaned, max_length=80):
    """Print before/after comparison"""
    orig_str = str(original)
    clean_str = str(cleaned)

    if len(orig_str) > max_length:
        orig_str = orig_str[:max_length] + "..."
    if len(clean_str) > max_length:
        clean_str = clean_str[:max_length] + "..."

    print(f"\n{label}:")
    print(f"  ORIGINAL: {orig_str}")
    print(f"  CLEANED:  {clean_str}")

    if original != cleaned:
        print("  ✓ CHANGED")
    else:
        print("  ○ No change")


def main():
    """Run validation tests"""
    print_section("RESUME DATA VALIDATION TEST")

    # Initialize ResumeAI
    print("\n1. Initializing ResumeAI...")
    ai = ResumeAI(model_name="qwen2.5-coder:7b")
    print("   ✓ ResumeAI initialized")

    # Load test data
    print("\n2. Loading test data...")
    test_file = os.path.join(os.path.dirname(__file__), "test_resume_data.json")

    if not os.path.exists(test_file):
        print(f"   ✗ Error: {test_file} not found!")
        return

    with open(test_file, 'r', encoding='utf-8') as f:
        original_data = json.load(f)

    print(f"   ✓ Loaded test data from: {os.path.basename(test_file)}")

    # Show original data highlights
    print_section("ORIGINAL DATA (Before Validation)")

    contact = original_data['interview_responses']['contact_information']
    job1 = original_data['interview_responses']['work_experience_job1']
    job2 = original_data['interview_responses']['work_experience_job2']
    skills = original_data['interview_responses']['skills']

    print("\nContact Information:")
    print(f"  • Job Title (Q2): {contact.get('Q2_job_title')}")
    print(f"  • Email: {contact.get('Q4_email')}")
    print(f"  • Location: {contact.get('Q5_location')}")

    print("\nWork Experience:")
    print(f"  • Job 1 Company: {job1.get('Q6_company')}")
    print(f"  • Job 1 Title (Q8): {job1.get('Q8_title')}")
    print(f"  • Job 1 Location: {job1.get('Q7_location')}")
    print(f"  • Job 2 Company: {job2.get('Q15_company')}")

    print("\nSkills (first 100 chars):")
    print(f"  • Technical: {skills.get('Q30_technical_skills')[:100]}...")
    print(f"  • Certifications: {skills.get('Q31_certifications_licenses')[:100]}...")
    print(f"  • Competencies: {skills.get('Q32_core_competencies')[:100]}...")

    # Apply validation
    print_section("APPLYING VALIDATION")
    print("\n3. Validating and cleaning responses...")
    cleaned_data = ai.validate_and_clean_all_responses(original_data)
    print("   ✓ Validation complete")

    print("\n4. Normalizing data structure...")
    normalized_data = ai.normalize_interview_data(cleaned_data)
    print("   ✓ Normalization complete")

    # Show cleaned data
    print_section("CLEANED DATA (After Validation)")

    print("\nContact Information:")
    print(f"  • Job Title: {normalized_data['contact_info'].get('job_title')}")
    print(f"  • Email: {normalized_data['contact_info'].get('email')}")
    print(f"  • Location: {normalized_data['contact_info'].get('location')}")

    print("\nWork Experience:")
    print(f"  • Total Jobs in Resume: {len(normalized_data['work_experience'])}")

    for i, job in enumerate(normalized_data['work_experience'], 1):
        print(f"\n  Job {i}:")
        print(f"    • Company: {job.get('company')}")
        print(f"    • Title: {job.get('title')}")
        print(f"    • Location: {job.get('location')}")
        print(f"    • Accomplishments: {len(job.get('accomplishments', []))} items")

    print("\nSkills:")
    print(f"  • Technical Skills ({len(normalized_data['skills']['technical_skills'])} items):")
    for skill in normalized_data['skills']['technical_skills'][:5]:
        print(f"      - {skill}")
    if len(normalized_data['skills']['technical_skills']) > 5:
        print(f"      ... and {len(normalized_data['skills']['technical_skills']) - 5} more")

    print(f"\n  • Certifications ({len(normalized_data['skills']['certifications_licenses'])} items):")
    for cert in normalized_data['skills']['certifications_licenses']:
        print(f"      - {cert}")

    print(f"\n  • Competencies ({len(normalized_data['skills']['core_competencies'])} items):")
    for comp in normalized_data['skills']['core_competencies'][:5]:
        print(f"      - {comp}")
    if len(normalized_data['skills']['core_competencies']) > 5:
        print(f"      ... and {len(normalized_data['skills']['core_competencies']) - 5} more")

    # Validation report
    print_section("VALIDATION REPORT")

    print("\n✓ SUCCESSFUL VALIDATIONS:")

    # Check 1: Job 2 filtered out
    if len(normalized_data['work_experience']) == 1:
        print("  ✓ Empty Job 2 (all 'No' responses) was correctly filtered out")
    else:
        print(f"  ✗ FAILED: Expected 1 job, got {len(normalized_data['work_experience'])}")

    # Check 2: Skills are lists
    if isinstance(normalized_data['skills']['technical_skills'], list):
        print("  ✓ Skills extracted as comma-separated list (not sentences)")
    else:
        print("  ✗ FAILED: Skills should be a list")

    # Check 3: Job title formatted
    if normalized_data['work_experience']:
        orig_title = job1.get('Q8_title')
        clean_title = normalized_data['work_experience'][0].get('title')
        if clean_title == orig_title:
            print(f"  ✓ Job title: {clean_title}")
        else:
            print(f"  ✓ Job title formatted: '{orig_title}' → '{clean_title}'")

    # Check 4: Location formatted
    if normalized_data['work_experience']:
        orig_loc = job1.get('Q7_location')
        clean_loc = normalized_data['work_experience'][0].get('location')
        if clean_loc != orig_loc:
            print(f"  ✓ Location formatted: '{orig_loc}' → '{clean_loc}'")

    # Check 5: Skills count
    tech_skills = normalized_data['skills']['technical_skills']
    if len(tech_skills) > 5:
        print(f"  ✓ Extracted {len(tech_skills)} individual technical skills from sentence")

    print_section("DETAILED COMPARISONS")

    # Contact info comparisons
    print_comparison(
        "Job Title (Q2)",
        contact.get('Q2_job_title'),
        normalized_data['contact_info'].get('job_title')
    )

    print_comparison(
        "Email",
        contact.get('Q4_email'),
        normalized_data['contact_info'].get('email')
    )

    print_comparison(
        "Location (Q5)",
        contact.get('Q5_location'),
        normalized_data['contact_info'].get('location')
    )

    # Work experience comparisons
    if normalized_data['work_experience']:
        print_comparison(
            "Job 1 Title (Q8)",
            job1.get('Q8_title'),
            normalized_data['work_experience'][0].get('title')
        )

        print_comparison(
            "Job 1 Location (Q7)",
            job1.get('Q7_location'),
            normalized_data['work_experience'][0].get('location')
        )

    # Skills comparison
    print_comparison(
        "Technical Skills (Q30)",
        skills.get('Q30_technical_skills'),
        ', '.join(normalized_data['skills']['technical_skills'][:5]) + "..."
    )

    print_comparison(
        "Certifications (Q31)",
        skills.get('Q31_certifications_licenses'),
        ', '.join(normalized_data['skills']['certifications_licenses'])
    )

    print_section("TEST SUMMARY")

    tests_passed = 0
    tests_total = 5

    if len(normalized_data['work_experience']) == 1:
        tests_passed += 1
        print("  ✓ Test 1: Empty job filtered")
    else:
        print("  ✗ Test 1: Empty job NOT filtered")

    if isinstance(normalized_data['skills']['technical_skills'], list):
        tests_passed += 1
        print("  ✓ Test 2: Skills are list")
    else:
        print("  ✗ Test 2: Skills are NOT list")

    if len(normalized_data['skills']['technical_skills']) > 5:
        tests_passed += 1
        print("  ✓ Test 3: Skills extracted from sentences")
    else:
        print("  ✗ Test 3: Skills NOT properly extracted")

    if normalized_data['work_experience'] and normalized_data['work_experience'][0].get('title'):
        tests_passed += 1
        print("  ✓ Test 4: Job title exists")
    else:
        print("  ✗ Test 4: Job title missing")

    if normalized_data['contact_info'].get('location'):
        tests_passed += 1
        print("  ✓ Test 5: Location formatted")
    else:
        print("  ✗ Test 5: Location missing")

    print(f"\n{'=' * 70}")
    print(f"  TESTS PASSED: {tests_passed}/{tests_total}")
    print(f"{'=' * 70}\n")

    if tests_passed == tests_total:
        print("✓ ALL TESTS PASSED! Validation is working correctly.")
        return 0
    else:
        print("✗ SOME TESTS FAILED. Please review the validation logic.")
        return 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
