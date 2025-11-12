#!/usr/bin/env python3
"""
Resume AI - Ollama Integration Script
This script connects to a local Ollama instance and uses the qwen2.5-coder:7b model
to analyze resume-related files and provide insights.
"""

import os
import sys

try:
    import ollama
except ImportError:
    print("Error: 'ollama' package not found.")
    print("Please install it using: pip install ollama")
    sys.exit(1)


class ResumeAI:
    """Class to handle Ollama connection and file analysis."""

    def __init__(self, model_name="qwen2.5-coder:7b"):
        """Initialize the Resume AI with specified Ollama model."""
        self.model_name = model_name
        self.base_path = os.path.dirname(os.path.abspath(__file__))

    def test_connection(self):
        """Test connection to Ollama instance."""
        try:
            # Try to list available models
            models_response = ollama.list()
            print(f" Successfully connected to Ollama")

            # Handle different response formats
            models_list = models_response.get('models', [])

            # Extract model names - try different possible keys
            model_names = []
            for m in models_list:
                if isinstance(m, dict):
                    # Try 'name' first, then 'model', then string representation
                    name = m.get('name') or m.get('model') or str(m)
                    model_names.append(name)
                else:
                    model_names.append(str(m))

            print(f"Available models: {model_names}")

            # Check if our target model is available
            if any(self.model_name in name for name in model_names):
                print(f" Target model '{self.model_name}' is available")
                return True
            else:
                print(f" Warning: Model '{self.model_name}' not found in available models")
                print(f"Available models are: {model_names}")
                print("\nYou may need to pull the model first:")
                print(f"  ollama pull {self.model_name}")
                return False

        except Exception as e:
            print(f" Failed to connect to Ollama: {e}")
            print(f"Error type: {type(e).__name__}")
            import traceback
            traceback.print_exc()
            print("\nMake sure Ollama is running (try 'ollama serve' in terminal)")
            return False

    def read_file(self, filename):
        """Read a file from the backend-PY directory."""
        filepath = os.path.join(self.base_path, filename)
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            print(f" Successfully read {filename} ({len(content)} characters)")
            return content
        except FileNotFoundError:
            print(f" Error: File '{filename}' not found at {filepath}")
            return None
        except Exception as e:
            print(f" Error reading {filename}: {e}")
            return None


    def normalize_interview_data(self, raw_data):
        """Normalize interview response data to a cleaner format."""
        # Check if data has interview_responses wrapper
        if 'interview_responses' in raw_data:
            data = raw_data['interview_responses']
        else:
            return raw_data  # Already in correct format

        # Extract and normalize the data
        normalized = {
            "contact_info": {
                "full_name": data['contact_information'].get('Q1_full_name', ''),
                "job_title": data['contact_information'].get('Q2_job_title', ''),
                "phone_number": data['contact_information'].get('Q3_phone_number', ''),
                "email": data['contact_information'].get('Q4_email', ''),
                "location": data['contact_information'].get('Q5_location', '')
            },
            "work_experience": [],
            "skills": {
                "technical_skills": data['skills'].get('Q30_technical_skills', '').split(', '),
                "certifications_licenses": data['skills'].get('Q31_certifications_licenses', '').split(', '),
                "core_competencies": data['skills'].get('Q32_core_competencies', '').split(', ')
            },
            "education": [],
            "certifications_detailed": []
        }

        # Process job 1 if exists
        if 'work_experience_job1' in data and data['work_experience_job1'].get('Q6_company'):
            job1 = data['work_experience_job1']
            accomplishments = [job1.get('Q11_accomplishment_1', '')]
            if job1.get('Q12_accomplishment_2'):
                accomplishments.append(job1['Q12_accomplishment_2'])
            if job1.get('Q13_accomplishment_3'):
                accomplishments.append(job1['Q13_accomplishment_3'])
            if job1.get('Q14_accomplishment_4'):
                accomplishments.append(job1['Q14_accomplishment_4'])

            normalized['work_experience'].append({
                "job_number": 1,
                "company": job1.get('Q6_company', ''),
                "location": job1.get('Q7_location', ''),
                "title": job1.get('Q8_title', ''),
                "start_date": job1.get('Q9_start_date', ''),
                "end_date": job1.get('Q10_end_date', ''),
                "accomplishments": [a for a in accomplishments if a]
            })

        # Process job 2 if exists
        if 'work_experience_job2' in data and data['work_experience_job2'].get('Q15_company') and data['work_experience_job2'].get('Q15_company').lower() != 'no':
            job2 = data['work_experience_job2']
            accomplishments = []
            if job2.get('Q20_accomplishment_1'):
                accomplishments.append(job2['Q20_accomplishment_1'])
            if job2.get('Q21_accomplishment_2'):
                accomplishments.append(job2['Q21_accomplishment_2'])
            if job2.get('Q22_accomplishment_3'):
                accomplishments.append(job2['Q22_accomplishment_3'])

            normalized['work_experience'].append({
                "job_number": 2,
                "company": job2.get('Q15_company', ''),
                "location": job2.get('Q16_location', ''),
                "title": job2.get('Q17_title', ''),
                "start_date": job2.get('Q18_start_date', ''),
                "end_date": job2.get('Q19_end_date', ''),
                "accomplishments": [a for a in accomplishments if a]
            })

        # Process job 3 if exists
        if 'work_experience_job3' in data and data['work_experience_job3'].get('Q23_company') and data['work_experience_job3'].get('Q23_company').lower() != 'no':
            job3 = data['work_experience_job3']
            accomplishments = []
            if job3.get('Q28_accomplishment_1'):
                accomplishments.append(job3['Q28_accomplishment_1'])
            if job3.get('Q29_accomplishment_2'):
                accomplishments.append(job3['Q29_accomplishment_2'])

            normalized['work_experience'].append({
                "job_number": 3,
                "company": job3.get('Q23_company', ''),
                "location": job3.get('Q24_location', ''),
                "title": job3.get('Q25_title', ''),
                "start_date": job3.get('Q26_start_date', ''),
                "end_date": job3.get('Q27_end_date', ''),
                "accomplishments": [a for a in accomplishments if a]
            })

        # Process education
        if 'education' in data and data['education'].get('Q33_has_education', '').lower() != 'no':
            edu = data['education']
            normalized['education'].append({
                "institution": edu.get('Q34_institution', ''),
                "location": edu.get('Q35_location', ''),
                "credential": edu.get('Q36_credential', ''),
                "date": edu.get('Q37_date', '')
            })

        # Process certifications
        if 'certifications_detailed' in data:
            certs = data['certifications_detailed']

            # Cert 1
            if 'certification_1' in certs and certs['certification_1'].get('Q39_name'):
                cert1 = certs['certification_1']
                normalized['certifications_detailed'].append({
                    "name": cert1.get('Q39_name', ''),
                    "organization": cert1.get('Q40_organization', ''),
                    "date": cert1.get('Q41_date', ''),
                    "details": cert1.get('Q42_details', 'No')
                })

            # Cert 2
            if 'certification_2' in certs and certs['certification_2'].get('Q43_name') and certs['certification_2'].get('Q43_name').lower() != 'no':
                cert2 = certs['certification_2']
                normalized['certifications_detailed'].append({
                    "name": cert2.get('Q43_name', ''),
                    "organization": cert2.get('Q44_organization', ''),
                    "date": cert2.get('Q45_date', ''),
                    "details": cert2.get('Q46_details', 'No')
                })

            # Cert 3
            if 'certification_3' in certs and certs['certification_3'].get('Q47_name') and certs['certification_3'].get('Q47_name').lower() != 'no':
                cert3 = certs['certification_3']
                normalized['certifications_detailed'].append({
                    "name": cert3.get('Q47_name', ''),
                    "organization": cert3.get('Q48_organization', ''),
                    "date": cert3.get('Q49_date', ''),
                    "details": cert3.get('Q50_details', 'No')
                })

            # Cert 4
            if 'certification_4' in certs and certs['certification_4'].get('Q51_name') and certs['certification_4'].get('Q51_name').lower() != 'no':
                cert4 = certs['certification_4']
                normalized['certifications_detailed'].append({
                    "name": cert4.get('Q51_name', ''),
                    "organization": cert4.get('Q52_organization', ''),
                    "date": cert4.get('Q53_date', ''),
                    "details": cert4.get('Q54_details', 'No')
                })

        return normalized

    def enhance_accomplishments_with_ai(self, accomplishments):
        """Use AI to enhance accomplishment descriptions."""
        prompt = f"""Enhance these job accomplishments to be more professional and impactful. Keep them truthful.

Original accomplishments:
{chr(10).join(f'- {acc}' for acc in accomplishments)}

Instructions:
- Make each point more professional and detailed
- Emphasize technical skills, tools, and quantifiable results
- Use strong action verbs
- Keep content truthful to the original
- Return ONLY the enhanced bullet points, one per line, starting with the text (no dashes or bullets)

Enhanced accomplishments:"""

        try:
            response = ollama.chat(
                model=self.model_name,
                messages=[{'role': 'user', 'content': prompt}]
            )
            enhanced = response['message']['content'].strip()
            # Split into lines and clean
            lines = [line.strip().lstrip('-•* ') for line in enhanced.split('\n') if line.strip()]
            return lines if lines else accomplishments
        except:
            return accomplishments

    def fill_template_programmatically(self, resume_data, template_content, enhance=True):
        """Fill the template using Python string replacement."""
        import re
        filled = template_content

        # 1. Contact info
        filled = filled.replace('[Your Full Name]', resume_data['contact_info']['full_name'])
        filled = filled.replace('[Your Job Title/Trade]', resume_data['contact_info']['job_title'])
        filled = filled.replace('[Your Phone Number]', resume_data['contact_info']['phone_number'])

        # Handle email
        if resume_data['contact_info']['email'].lower() == 'no':
            filled = re.sub(r'\\href\{mailto:your\.email@example\.com\}\{your\.email@example\.com\}\s*\$\|\$\s*\n?', '', filled)
        else:
            filled = filled.replace('your.email@example.com', resume_data['contact_info']['email'])

        # Replace first [City, State] in contact section
        filled = filled.replace('[City, State]', resume_data['contact_info']['location'], 1)

        # 2. Work Experience - handle multiple jobs
        work_exp_section = re.search(r'%-----------WORK EXPERIENCE-----------(.*?)%-----------SKILLS-----------', filled, re.DOTALL)

        if work_exp_section and resume_data['work_experience']:
            # Build new work experience section
            new_work_exp = "%-----------WORK EXPERIENCE-----------\n"
            new_work_exp += "\\section{Work Experience}\n\\resumeSubHeadingListStart\n\n"

            for job in resume_data['work_experience']:
                # Enhance accomplishments if requested
                accomplishments = job['accomplishments']
                if enhance:
                    print(f"  Enhancing accomplishments for {job['company']}...")
                    accomplishments = self.enhance_accomplishments_with_ai(accomplishments)

                new_work_exp += f"  \\resumeSubheading\n"
                new_work_exp += f"    {{{job['company']}}}{{{job['start_date']} - {job['end_date']}}}\n"
                new_work_exp += f"    {{{job['title']}}}{{{job['location']}}}\n"
                new_work_exp += f"    \\resumeItemListStart\n"

                for acc in accomplishments:
                    new_work_exp += f"      \\resumeItem{{{acc}}}\n"

                new_work_exp += f"    \\resumeItemListEnd\n\n"

            new_work_exp += "\\resumeSubHeadingListEnd\n\\vspace{-15pt}\n\n%-----------SKILLS-----------"

            # Escape backslashes for re.sub() - it interprets them as escape sequences
            new_work_exp_escaped = new_work_exp.replace('\\', r'\\')

            # Replace the work experience section
            filled = re.sub(
                r'%-----------WORK EXPERIENCE-----------(.*?)%-----------SKILLS-----------',
                new_work_exp_escaped,
                filled,
                flags=re.DOTALL
            )

        # 3. Skills
        skills_list = ', '.join(resume_data['skills']['technical_skills'])
        certs_list = ', '.join(resume_data['skills']['certifications_licenses'])
        comp_list = ', '.join(resume_data['skills']['core_competencies'])

        # Replace skills placeholders
        filled = re.sub(
            r'\[List relevant tools.*?\]',
            skills_list,
            filled
        )
        filled = re.sub(
            r'\[List any valid licenses.*?\]',
            certs_list,
            filled
        )
        filled = re.sub(
            r'\[List soft skills.*?\]',
            comp_list,
            filled
        )

        # 4. Education
        if resume_data['education']:
            edu = resume_data['education'][0]
            filled = re.sub(r'\[School/Institution Name\]', edu['institution'], filled, count=1)
            filled = re.sub(r'\[Graduation Date or "Present"\]', edu['date'], filled, count=1)
            filled = re.sub(r'\[Degree/Diploma/Certificate\]', edu['credential'], filled, count=1)
            # Handle [City, State] in education (the remaining ones)
            filled = filled.replace('[City, State]', edu['location'])

        # 5. Certifications
        cert_section = re.search(r'%-----------TRAINING & CERTIFICATIONS-----------(.*?)\\end\{document\}', filled, re.DOTALL)
        if cert_section and resume_data['certifications_detailed']:
            new_cert_section = "%-----------TRAINING & CERTIFICATIONS-----------\n"
            new_cert_section += "\\section{Training \\& Certifications}\n\\resumeSubHeadingListStart\n"

            for cert in resume_data['certifications_detailed']:
                details = f" - {cert['details']}" if cert['details'] and cert['details'].lower() != 'no' else ''
                new_cert_section += f"    \\resumeItem{{\\textbf{{{cert['name']}}} - {cert['organization']}, {cert['date']}{details}}}\n"

            new_cert_section += "\\resumeSubHeadingListEnd\n\\vspace{-16pt}\n\n\\end{document}"

            # Escape backslashes for re.sub() - it interprets them as escape sequences
            new_cert_section_escaped = new_cert_section.replace('\\', r'\\')

            filled = re.sub(
                r'%-----------TRAINING & CERTIFICATIONS-----------(.*?)\\end\{document\}',
                new_cert_section_escaped,
                filled,
                flags=re.DOTALL
            )

        return filled

    def fill_template_with_json(self, json_file):
        """Fill the LaTeX template with data from a JSON file."""
        print("\n" + "="*70)
        print("FILLING RESUME TEMPLATE WITH JSON DATA")
        print("="*70 + "\n")

        # Read the JSON file
        json_path = os.path.join(self.base_path, json_file)
        try:
            import json
            with open(json_path, 'r', encoding='utf-8') as f:
                raw_data = json.load(f)
            print(f"✓ Successfully loaded JSON data from {json_file}")

            # Normalize the data format
            resume_data = self.normalize_interview_data(raw_data)
            print(f"✓ Data normalized and ready for processing")
            print(f"Data preview: {json.dumps(resume_data, indent=2)[:500]}...\n")
        except FileNotFoundError:
            print(f"✗ Error: JSON file '{json_file}' not found at {json_path}")
            return False
        except json.JSONDecodeError as e:
            print(f"✗ Error: Invalid JSON format in {json_file}: {e}")
            return False
        except Exception as e:
            print(f"✗ Error reading JSON file: {e}")
            import traceback
            traceback.print_exc()
            return False

        # Read the LaTeX template
        template_content = self.read_file("blue_collar_resume_template.tex")
        if not template_content:
            print("✗ Error: Could not read LaTeX template")
            return False

        # Fill template programmatically (AI only enhances accomplishments)
        print(f"\nFilling template with {resume_data['contact_info']['full_name']}'s data...")
        print("Using programmatic filling to preserve template structure")
        print(f"AI will enhance accomplishments for professional impact...\n")

        try:
            filled_content = self.fill_template_programmatically(resume_data, template_content, enhance=True)

            # Save the filled template
            output_file = json_file.replace('.json', '_resume.tex')
            output_path = os.path.join(self.base_path, output_file)

            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(filled_content)

            print(f"\n✓ Filled resume saved to: {output_file}")
            print("✓ Template structure preserved")
            print("✓ All LaTeX commands intact")
            print("="*70)

            return True

        except Exception as e:
            print(f"✗ Error during template filling: {e}")
            import traceback
            traceback.print_exc()
            return False



def main():
    """Main function to run the Resume AI Generator."""
    print("""
    ╔══════════════════════════════════════════════════════════════════╗
    ║              RESUME AI GENERATOR - Blue Collar Edition           ║
    ║              Powered by Ollama + qwen2.5-coder:7b                ║
    ╚══════════════════════════════════════════════════════════════════╝
    """)

    # Initialize the AI
    ai = ResumeAI(model_name="qwen2.5-coder:7b")

    # Test connection
    print("Testing connection to Ollama...")
    if not ai.test_connection():
        print("\n⚠ Connection test failed. Please check that:")
        print("  1. Ollama is installed and running")
        print("  2. The qwen2.5-coder:7b model is pulled (try: ollama pull qwen2.5-coder:7b)")
        print("\nWould you like to continue anyway? (y/n): ", end='')
        choice = input().strip().lower()
        if choice != 'y':
            print("Exiting...")
            return

    # Main resume generation
    print("\nAvailable JSON files in directory:")
    print("  - interview_responses.json (default)")
    json_file = input("\nEnter JSON filename (or press Enter for default): ").strip()
    if not json_file:
        json_file = "interview_responses.json"

    ai.fill_template_with_json(json_file)


if __name__ == "__main__":
    main()
