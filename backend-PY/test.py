import rating_agent

job_posting = """
Warehouse Worker - $16/hour

What you'll do:
- Load and unload trucks
- Move boxes and pallets
- Use pallet jack and forklift
- Keep warehouse organized

What we need:
- Can lift 40 lbs
- Forklift experience (we can train if you've used similar equipment)
- Available Monday-Friday, 7am-4pm
- Reliable transportation

Start immediately
"""

candidate_application = """
Name: Maria Garcia

Work history:
- Worked at Target warehouse for 8 months (2023-2024)
  Used pallet jack every day
  Loaded trucks
  Organized stockroom
  
- Worked at Amazon warehouse for 1 year (2022-2023)
  Picked orders
  Used hand scanner
  Moved boxes all day

- Helped at uncle's moving company summers in 2020 and 2021
  Loaded furniture
  Drove box truck (not 18-wheeler)

What I can do:
- Used pallet jack lots of times
- Good at lifting and moving boxes (I can lift 50 lbs no problem)
- Worked in warehouse before so I know how it works
- Never used a forklift but I drove the box truck for my uncle

I have my own car. I can work any hours. I can start right away.
"""

# Evaluate
result = rating_agent.evaluate_worker(job_posting, candidate_application)
rating_agent.print_evaluation(result)