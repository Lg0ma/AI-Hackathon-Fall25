from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from EvalForm import EvalForm

parser = PydanticOutputParser(pydantic_object=EvalForm)

simple_evaluation_prompt = PromptTemplate(
    template="""You are evaluating someone for a hands-on job. Focus on what they can ACTUALLY DO, not education or certificates.

JOB REQUIREMENTS:
{job_description}

WHAT THE PERSON SAYS THEY CAN DO:
{candidate_info}

Answer these questions:

1. HAVE THEY DONE THIS WORK BEFORE?
   - Yes or No?
   - If yes, for how many months total?
   - Skill level: Beginner (just learning), Some Experience (done it a bit), Experienced (done it a lot), or Expert (really good at it)

2. EQUIPMENT & MACHINERY:
   - List every piece of equipment or machine they say they've used
   - Which ones from the job requirements have they used?
   - Which required equipment have they NOT used?
   - Score 1-10: How well does their equipment experience match what's needed?

3. CAN THEY HANDLE THE WORK?
   - Can they do the physical work? (lifting, standing all day, working outside, etc.)
   - Do they have a way to get to work? (car, bus, ride, etc.)
   - Can they work the hours/days needed?

4. WORK HISTORY:
   - How long did they stay at their last job? (in months)
   - Score 1-10: Do they seem reliable? (stayed at jobs, show up on time, etc.)

5. WHAT CAN THEY ACTUALLY DO?
   - List 3-5 specific things they know how to do (examples: "drive forklift", "use power tools", "mix concrete", "load trucks")
   - List what they CAN'T do that the job needs

6. OVERALL:
   - Score 1-100: How good of a match are they?
   - Can they start working right away or soon?
   - Recommendation: 
     * YES - They can do the job, hire them
     * MAYBE - They might work, need to talk to them first
     * NO - They're not ready for this job
   - Why? (Keep it simple: "Has 2 years experience with all required equipment" or "Never used a forklift, job requires it")

Be realistic. If someone says they've used equipment, believe them. Focus on whether they can do the actual work.

{format_instructions}""",
    input_variables=["job_description", "candidate_info"],
    partial_variables={"format_instructions": parser.get_format_instructions()}
)