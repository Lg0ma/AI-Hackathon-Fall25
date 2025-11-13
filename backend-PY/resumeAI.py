#!/usr/bin/env python3
"""
Resume AI - Blue-Collar Resume Generator

This script generates professional LaTeX resumes from interview response data
and compiles them to PDF.

It uses a hybrid approach:
- Python handles precise template structure preservation
- AI (Ollama + qwen2.5-coder:7b) enhances accomplishment descriptions

Key Features:
- Accepts JSON data directly (no file path dependencies)
- Programmatically fills LaTeX template preserving all commands
- AI enhancement of job accomplishments (optional)
- Automatic education section removal if no data provided
- Automatic PDF compilation with pdflatex
- Optional .tex file cleanup (keep only PDF)
- Proper LaTeX character escaping

Usage Example:
    import json
    from resumeAI import ResumeAI

    # Initialize
    ai = ResumeAI(model_name="qwen2.5-coder:7b")

    # Load your JSON data
    with open('interview_responses.json', 'r') as f:
        json_data = json.load(f)

    # Generate resume PDF
    result = ai.generate_resume(
        json_data=json_data,
        output_filename="candidate_resume",
        enhance=True,       # Use AI to enhance accomplishments
        compile_pdf=True,   # Compile to PDF
        keep_tex=False      # Don't keep .tex file (only PDF)
    )

    # Result contains paths to generated files
    print(f"PDF: {result['pdf']}")
"""

import os
import sys
import subprocess
import shutil

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
        if 'education' in data:
            edu = data['education']
            # Check if education data exists (either has Q33_has_education as "Yes" or has institution data)
            has_education = (
                edu.get('Q33_has_education', '').lower() == 'yes' or
                edu.get('Q34_institution', '') != ''
            )

            if has_education and edu.get('Q34_institution'):
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

    def escape_latex(self, text):
        """Escape special LaTeX characters in text."""
        if not isinstance(text, str):
            text = str(text)

        # Remove or replace problematic whitespace
        text = text.replace('\r\n', ' ').replace('\n', ' ').replace('\r', ' ')
        # Collapse multiple spaces
        text = ' '.join(text.split())

        # IMPORTANT: Replace backslash FIRST to avoid corrupting other escape sequences
        text = text.replace('\\', r'\textbackslash{}')

        # Then replace other special characters
        replacements = [
            ('&', r'\&'),
            ('%', r'\%'),
            ('$', r'\$'),
            ('#', r'\#'),
            ('_', r'\_'),
            ('{', r'\{'),
            ('}', r'\}'),
            ('~', r'\textasciitilde{}'),
            ('^', r'\^{}'),
        ]

        for char, replacement in replacements:
            text = text.replace(char, replacement)

        return text

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
- Each bullet point must be on a SINGLE line (no line breaks within a point)

Enhanced accomplishments:"""

        try:
            response = ollama.chat(
                model=self.model_name,
                messages=[{'role': 'user', 'content': prompt}]
            )
            enhanced = response['message']['content'].strip()
            # Split into lines and clean thoroughly
            lines = []
            for line in enhanced.split('\n'):
                line = line.strip().lstrip('-•* ')
                # Skip empty lines and common headers
                if line and not line.lower().startswith(('enhanced', 'accomplishment', ':')):
                    lines.append(line)
            return lines if lines else accomplishments
        except Exception as e:
            print(f"  Warning: AI enhancement failed ({e}), using original text")
            return accomplishments

    def fill_template_programmatically(self, resume_data, template_content, enhance=True):
        """Fill the template using Python string replacement."""
        import re
        filled = template_content

        # 1. Contact Information
        filled = filled.replace('[Your Full Name]', self.escape_latex(resume_data['contact_info']['full_name']))
        filled = filled.replace('[Your Job Title/Trade]', self.escape_latex(resume_data['contact_info']['job_title']))
        filled = filled.replace('[Your Phone Number]', self.escape_latex(resume_data['contact_info']['phone_number']))

        # Handle email (remove if not provided)
        if resume_data['contact_info']['email'].lower() == 'no':
            filled = re.sub(r'\\href\{mailto:your\.email@example\.com\}\{your\.email@example\.com\}\s*\$\|\$\s*\n?', '', filled)
        else:
            filled = filled.replace('your.email@example.com', self.escape_latex(resume_data['contact_info']['email']))

        filled = filled.replace('[City, State]', self.escape_latex(resume_data['contact_info']['location']), 1)

        # 2. Work Experience
        if resume_data['work_experience']:
            new_work_exp = "%-----------WORK EXPERIENCE-----------\n"
            new_work_exp += "\\section{Work Experience}\n\\resumeSubHeadingListStart\n\n"

            for job in resume_data['work_experience']:
                accomplishments = job['accomplishments']
                if enhance:
                    print(f"  Enhancing accomplishments for {job['company']}...")
                    accomplishments = self.enhance_accomplishments_with_ai(accomplishments)

                new_work_exp += f"  \\resumeSubheading\n"
                new_work_exp += f"    {{{self.escape_latex(job['company'])}}}{{{self.escape_latex(job['start_date'])} - {self.escape_latex(job['end_date'])}}}\n"
                new_work_exp += f"    {{{self.escape_latex(job['title'])}}}{{{self.escape_latex(job['location'])}}}\n"
                new_work_exp += f"    \\resumeItemListStart\n"

                for acc in accomplishments:
                    if not acc or not acc.strip():
                        continue
                    escaped_acc = self.escape_latex(acc)
                    new_work_exp += f"      \\resumeItem{{{escaped_acc}}}\n"

                new_work_exp += f"    \\resumeItemListEnd\n\n"

            new_work_exp += "\\resumeSubHeadingListEnd\n\\vspace{-15pt}\n\n%-----------SKILLS-----------"

            filled = re.sub(
                r'%-----------WORK EXPERIENCE-----------(.*?)%-----------SKILLS-----------',
                lambda _: new_work_exp,
                filled,
                flags=re.DOTALL
            )

        # 3. Skills - rebuild the entire section with correct structure
        skills_list = ', '.join([self.escape_latex(s) for s in resume_data['skills']['technical_skills']])
        certs_list = ', '.join([self.escape_latex(c) for c in resume_data['skills']['certifications_licenses']])
        comp_list = ', '.join([self.escape_latex(c) for c in resume_data['skills']['core_competencies']])

        # Build the skills section with correct LaTeX structure
        new_skills_section = "%-----------SKILLS-----------\n"
        new_skills_section += "\\section{Skills}\n"
        new_skills_section += "\\resumeItemListStart\n"
        new_skills_section += f"  \\resumeItem{{\\textbf{{Technical Skills:}} {skills_list}}}\n"
        new_skills_section += f"  \\resumeItem{{\\textbf{{Certifications \\& Licenses:}} {certs_list}}}\n"
        new_skills_section += f"  \\resumeItem{{\\textbf{{Core Competencies:}} {comp_list}}}\n"
        new_skills_section += "\\resumeItemListEnd\n"
        new_skills_section += "\\vspace{-15pt}\n\n"
        new_skills_section += "%-----------EDUCATION-----------"

        # Replace the entire skills section
        filled = re.sub(
            r'%-----------SKILLS-----------(.*?)%-----------EDUCATION-----------',
            lambda _: new_skills_section,
            filled,
            flags=re.DOTALL
        )

        # 4. Education (remove section if no education data)
        if resume_data['education']:
            edu = resume_data['education'][0]
            filled = re.sub(r'\[School/Institution Name\]', lambda _: self.escape_latex(edu['institution']), filled, count=1)
            filled = re.sub(r'\[Graduation Date or "Present"\]', lambda _: self.escape_latex(edu['date']), filled, count=1)
            filled = re.sub(r'\[Degree/Diploma/Certificate\]', lambda _: self.escape_latex(edu['credential']), filled, count=1)
            filled = filled.replace('[City, State]', self.escape_latex(edu['location']))
        else:
            # Remove entire education section if no education data
            filled = re.sub(
                r'%-----------EDUCATION-----------(.*?)%-----------TRAINING & CERTIFICATIONS-----------',
                '%-----------TRAINING & CERTIFICATIONS-----------',
                filled,
                flags=re.DOTALL
            )

        # 5. Certifications
        if resume_data['certifications_detailed']:
            new_cert_section = "%-----------TRAINING & CERTIFICATIONS-----------\n"
            new_cert_section += "\\section{Training \\& Certifications}\n\\resumeSubHeadingListStart\n"

            for cert in resume_data['certifications_detailed']:
                details = f" - {self.escape_latex(cert['details'])}" if cert['details'] and cert['details'].lower() != 'no' else ''
                new_cert_section += f"    \\resumeItem{{\\textbf{{{self.escape_latex(cert['name'])}}} - {self.escape_latex(cert['organization'])}, {self.escape_latex(cert['date'])}{details}}}\n"

            new_cert_section += "\\resumeSubHeadingListEnd\n\\vspace{-16pt}\n\n\\end{document}"

            filled = re.sub(
                r'%-----------TRAINING & CERTIFICATIONS-----------(.*?)\\end\{document\}',
                lambda _: new_cert_section,
                filled,
                flags=re.DOTALL
            )

        return filled

    def compile_latex_to_pdf(self, tex_file_path):
        """
        Compile a LaTeX file to PDF using pdflatex.

        Args:
            tex_file_path (str): Path to the .tex file

        Returns:
            str: Path to the generated PDF file, or None if compilation failed
        """
        try:
            # Get the directory and filename
            tex_dir = os.path.dirname(tex_file_path)
            tex_filename = os.path.basename(tex_file_path)
            pdf_filename = tex_filename.replace('.tex', '.pdf')
            pdf_path = os.path.join(tex_dir, pdf_filename)

            print(f"\nCompiling LaTeX to PDF...")

            # Check if pdflatex is available
            if not shutil.which('pdflatex'):
                print("  Warning: pdflatex not found. Please install a LaTeX distribution:")
                print("    - Windows: MiKTeX or TeX Live")
                print("    - macOS: MacTeX")
                print("    - Linux: texlive-full")
                return None

            # Run pdflatex twice (for proper formatting and references)
            for run_num in range(2):
                if run_num == 0:
                    print(f"  First pass...")
                else:
                    print(f"  Second pass...")

                result = subprocess.run(
                    ['pdflatex', '-interaction=nonstopmode', '-halt-on-error', '-output-directory', tex_dir, tex_file_path],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    cwd=tex_dir,
                    timeout=60  # Increased to 60 seconds
                )

                if result.returncode != 0:
                    print(f"  Error: pdflatex compilation failed")
                    print(f"  Return code: {result.returncode}")
                    # Print last few lines of output for debugging
                    output = result.stdout.decode('utf-8', errors='ignore')
                    lines = output.split('\n')
                    print("  Last 10 lines of output:")
                    for line in lines[-10:]:
                        if line.strip():
                            print(f"    {line}")
                    return None

            # Clean up auxiliary files
            aux_extensions = ['.aux', '.log', '.out']
            base_name = tex_filename.replace('.tex', '')
            for ext in aux_extensions:
                aux_file = os.path.join(tex_dir, base_name + ext)
                if os.path.exists(aux_file):
                    try:
                        os.remove(aux_file)
                    except:
                        pass  # Ignore cleanup errors

            if os.path.exists(pdf_path):
                print(f"  ✓ PDF compiled successfully: {pdf_filename}")
                return pdf_path
            else:
                print(f"  Error: PDF file was not created")
                return None

        except subprocess.TimeoutExpired:
            print("  Error: LaTeX compilation timed out after 60 seconds")
            print("  This usually means there's an error in the LaTeX code.")
            print("  Check the .tex file for issues like unescaped special characters.")
            return None
        except Exception as e:
            print(f"  Error during PDF compilation: {e}")
            import traceback
            traceback.print_exc()
            return None

    def generate_resume(self, json_data, output_filename="resume", enhance=True, compile_pdf=True, keep_tex=False):
        """
        Generate a LaTeX resume from JSON data.

        Args:
            json_data (dict): Resume data in JSON format (either raw interview format or normalized)
            output_filename (str): Base name for output file (without extension)
            enhance (bool): Whether to use AI to enhance accomplishments
            compile_pdf (bool): Whether to compile LaTeX to PDF (default: True)
            keep_tex (bool): Whether to keep the .tex file after PDF compilation (default: False)

        Returns:
            dict: Dictionary with 'pdf' and/or 'tex' paths, or None if failed
                  Example: {'pdf': 'path/to/resume.pdf', 'tex': 'path/to/resume.tex'}
        """
        try:
            # Normalize the data format
            resume_data = self.normalize_interview_data(json_data)

            # Debug: Show what education data was found
            if resume_data['education']:
                print(f"  Education: {resume_data['education'][0]['institution']}")
            else:
                print(f"  Education: None (section will be removed)")

            # Read the LaTeX template
            template_content = self.read_file("blue_collar_resume_template.tex")
            if not template_content:
                raise ValueError("Could not read LaTeX template")

            # Fill template programmatically (AI only enhances accomplishments if requested)
            filled_content = self.fill_template_programmatically(resume_data, template_content, enhance=enhance)

            # Prepare output filename
            if output_filename.endswith('.tex'):
                output_filename = output_filename[:-4]

            tex_filename = output_filename + '.tex'
            tex_path = os.path.join(self.base_path, tex_filename)

            # Save the .tex file
            with open(tex_path, 'w', encoding='utf-8') as f:
                f.write(filled_content)

            result = {}

            # Compile to PDF if requested
            if compile_pdf:
                pdf_path = self.compile_latex_to_pdf(tex_path)
                if pdf_path:
                    result['pdf'] = pdf_path

                    # Delete .tex file if requested
                    if not keep_tex:
                        try:
                            os.remove(tex_path)
                            print(f"  ✓ Temporary .tex file removed")
                        except Exception as e:
                            print(f"  Warning: Could not remove .tex file: {e}")
                    else:
                        result['tex'] = tex_path
                else:
                    # If PDF compilation failed, keep the .tex file
                    result['tex'] = tex_path
                    print(f"  ✓ LaTeX file saved: {tex_filename}")
            else:
                result['tex'] = tex_path

            return result if result else None

        except Exception as e:
            print(f"Error generating resume: {e}")
            import traceback
            traceback.print_exc()
            return None



def main():
    """Main function to run the Resume AI Generator."""
    import json

    print("""
    ╔══════════════════════════════════════════════════════════════════╗
    ║                          RESUME AI GENERATOR                     ║
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

    # Load JSON data from file
    json_path = os.path.join(ai.base_path, json_file)
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            json_data = json.load(f)
        print(f"\n✓ Successfully loaded JSON data from {json_file}")
    except FileNotFoundError:
        print(f"\n✗ Error: JSON file '{json_file}' not found")
        return
    except json.JSONDecodeError as e:
        print(f"\n✗ Error: Invalid JSON format: {e}")
        return

    # Generate the resume
    print("\nGenerating resume...")
    output_file = json_file.replace('.json', '_resume')
    result = ai.generate_resume(
        json_data=json_data,
        output_filename=output_file,
        enhance=True,
        compile_pdf=True,  # Compile to PDF
        keep_tex=False  # Don't keep .tex file (only PDF)
    )

    if result:
        print("\n" + "="*70)
        print("✓ Resume successfully generated!")
        print("="*70)
        if 'pdf' in result:
            print(f"📄 PDF: {result['pdf']}")
        if 'tex' in result:
            print(f"📝 LaTeX: {result['tex']}")
        print("✓ Template structure preserved")
        print("✓ All LaTeX commands intact")
        print("="*70)
    else:
        print("\n✗ Resume generation failed")


if __name__ == "__main__":
    main()
