from langchain_ollama import OllamaLLM
from EvalPrompt import simple_evaluation_prompt, parser


# Initialize Ollama LLM
llm = OllamaLLM(
    model="mistral:7b",
    temperature=0,
)

# Create evaluation chain using LCEL (LangChain Expression Language)
evaluation_chain = simple_evaluation_prompt | llm | parser

def evaluate_worker(job_description: str, candidate_info: str):
    """
    Evaluate someone for hands-on work
    """
    try:
        # Use invoke() instead of deprecated run()
        evaluation = evaluation_chain.invoke({
            "job_description": job_description,
            "candidate_info": candidate_info
        })

        return evaluation

    except Exception as e:
        print(f"Error: {e}")
        print(f"Error details: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        return None


def print_evaluation(eval_result):
    """
    Display results in simple format
    """
    print("\n" + "="*50)
    print(f"RECOMMENDATION: {eval_result.recommendation}")
    print(f"Reason: {eval_result.reason}")
    print(f"Overall Score: {eval_result.overall_score}/100")
    print("="*50)
    
    print(f"\n✓ Done this work before? {eval_result.has_done_this_work_before}")
    if eval_result.has_done_this_work_before:
        years = eval_result.months_experience / 12
        print(f"  Experience: {eval_result.months_experience} months ({years:.1f} years)")
        print(f"  Skill Level: {eval_result.skill_level}")
    
    print(f"\n Equipment they've used:")
    for equipment in eval_result.equipment_used:
        print(f"  - {equipment}")
    print(f"  Equipment Match Score: {eval_result.equipment_match_score}/10")
    
    print(f"\n✓ Can do physical work? {eval_result.can_do_physical_work}")
    print(f"✓ Has transportation? {eval_result.has_transportation}")
    print(f"✓ Can work schedule? {eval_result.can_work_schedule}")
    print(f"✓ Ready to start? {eval_result.ready_to_work}")
    
    print(f"\n What they CAN do:")
    for skill in eval_result.what_they_can_do:
        print(f"  - {skill}")
    
    if eval_result.what_they_cant_do:
        print(f"\n What they CAN'T do (but job needs):")
        for gap in eval_result.what_they_cant_do:
            print(f"  - {gap}")