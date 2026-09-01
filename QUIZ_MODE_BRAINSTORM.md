# The OpenStudy quiz

## Working premise

A student does not open a quiz because they want to answer questions. They open it because they need an honest answer to a more uncomfortable question:

> Do I actually know this well enough?

Most quiz tools answer with a percentage. That is too shallow. A score cannot distinguish memory from understanding, confidence from guessing, or a durable skill from something the student will forget tomorrow.

OpenStudy Quiz mode should build evidence. It should discover what the student knows, expose what they only recognize, repair weak understanding, and finish by telling them exactly what deserves attention next.

The unit of progress is not a completed question. It is a change in the student's knowledge state.

## Product decisions

These choices define the mode:

- It supports first-time learning, exam preparation, and long-term retention. The system infers which behavior fits from the session, material, and student performance.
- It stays faithful to the attached material for facts, then creates transfer questions that apply those facts to unfamiliar situations.
- It begins as a calm examiner. When it finds a gap, it becomes a precise tutor. Once the gap is repaired, it returns to examination.
- It does not promise a fixed question count. The round ends when it has enough evidence, the student reaches a time limit, or the student chooses to stop.
- It measures confidence as well as correctness.
- It permits the student to challenge a question, answer, or explanation. Ambiguous model output must never become unquestionable truth.

## The student's mental loop

Every part of the mode should serve this loop:

1. **Orient me.** What am I about to be tested on, and how long will this roughly take?
2. **Make me commit.** Ask for an answer before showing cues that make recognition feel like recall.
3. **Tell me what my answer means.** Was I wrong because I forgot, misunderstood, rushed, guessed, or applied the idea badly?
4. **Help me repair it.** Give the smallest explanation that closes the gap.
5. **Make me prove the repair.** Test the same idea again from another angle.
6. **Show me where I stand.** Tell me which concepts are secure, fragile, untested, or deteriorating.
7. **Tell me what to do next.** Continue, revisit the material, take a fresh round, or schedule a later review.

## Starting a round

Quiz mode opens with a short briefing rather than immediately throwing a question on screen.

The briefing contains:

- The concepts found in the material
- The concepts selected for this round
- The intended depth, such as recall, understanding, application, or exam simulation
- An estimated duration expressed as a range
- Any gaps in the source material that may limit reliable grading

The default action is **Start adaptive round**.

The student may adjust one meaningful constraint before starting:

- Available time
- Desired intensity
- Exam simulation on or off

The student should not have to configure question count, format distribution, difficulty, or topic weights unless they deliberately open advanced controls. Those are consequences of the learning goal, not chores for the student.

## The adaptive round

The round is assembled continuously. It is not a list generated in advance.

After every answer, OpenStudy updates a compact learner model and chooses the next action with the highest expected learning value. That action may be another question, a repair, a transfer problem, a delayed retest, or the end of the round.

### Evidence tracked per concept

- Correctness
- Confidence before feedback
- Response time relative to question complexity
- Use of hints
- Quality of explanation or working
- Performance when the same idea appears in a different form
- Performance after a delay
- Error pattern
- Source coverage

The model should never display fake precision such as “87.4% mastery.” Internally it may use probabilities. The interface should use honest states:

- **Secure**: demonstrated through recall and transfer
- **Developing**: correct with support or inconsistent across forms
- **Fragile**: correct but slow, low-confidence, or recognition-dependent
- **Misunderstood**: a repeatable wrong mental model is visible
- **Untested**: insufficient evidence

### Question selection

The next question should maximize useful evidence, not novelty. Selection weighs:

- Importance of the concept in the material
- Current uncertainty about the student's knowledge
- Prerequisite relationships
- Previous errors and confidence
- Time since the concept last appeared
- Format fatigue
- Remaining session time
- Whether the student has proven transfer

This creates a round that can stop after four questions for a narrow, well-understood note or continue much longer for a dense chapter with several weak prerequisites.

## The question ladder

Each concept can be tested at increasing depth. OpenStudy moves up only when the student earns it.

1. **Recognition**: distinguish the correct idea from plausible alternatives
2. **Recall**: produce the idea without answer choices
3. **Explanation**: state why it is true or how it works
4. **Application**: use it in a concrete problem
5. **Discrimination**: separate it from a nearby concept or tempting misconception
6. **Transfer**: apply it in a situation not shown in the material
7. **Synthesis**: combine it with another concept to reason through a larger problem

Multiple choice remains useful, but it is one instrument. It should not dominate the mode.

## Question forms

### Free recall first

For concepts that should be retrievable from memory, show the question without choices. The student types a short answer. If they stall, they can request progressive support:

1. A structural hint
2. A relevant clue
3. Multiple-choice options

The evidence changes depending on how much support was needed. Getting the answer after seeing choices is useful, but it is not recorded as unaided recall.

### Explain your reasoning

For conceptual questions, the answer alone is not enough. Ask for one or two lines of reasoning. Grade against a small rubric derived from the material:

- Required idea present
- Causal relationship correct
- Unsupported claim absent
- Important qualification included

The student sees which part of the reasoning was strong and which part failed.

### Misconception duel

Present two plausible explanations. One encodes a common misconception. Ask the student to choose and explain the decisive difference.

This is especially valuable when a student can memorize the right phrase but still carries the wrong underlying model.

### Complete the chain

Show a process, proof, causal chain, timeline, or derivation with one meaningful step missing. Ask the student to restore it and explain why it belongs there.

### Counterexample

Give a claim and ask the student to find a counterexample, boundary condition, or situation where it stops being true.

### Error diagnosis

Show a worked answer containing a realistic mistake. Ask where the reasoning first goes wrong. This tests understanding more deeply than repeating the correct procedure.

### Transfer problem

Create a new situation whose surface details differ from the source while the underlying concept remains the same. The explanation must trace the solution back to the source concept.

### Confidence bet

Before submission, the student marks confidence with three fast choices:

- Unsure
- Think so
- Certain

This should take one keypress. It is not a personality test. It creates four important outcomes:

| Result | Meaning |
| --- | --- |
| Correct and certain | Likely secure, still needs transfer evidence |
| Correct and unsure | Knowledge exists but retrieval is fragile |
| Wrong and unsure | Honest gap, usually easy to repair |
| Wrong and certain | Likely misconception, highest repair priority |

## Answer evaluation

Feedback should answer three questions in order:

1. What was correct or incorrect?
2. What does that reveal about the student's thinking?
3. What is the smallest next action that would improve it?

### Correct answers

Do not celebrate every correct answer with noise. Confirm it, identify the evidence gained, then continue.

Example:

> Correct. You identified the mechanism and the condition that activates it. This concept now has recall evidence; application is still untested.

### Incorrect answers

Do not dump a complete lesson immediately. First classify the error:

- Retrieval failure
- Concept confusion
- Reversed relationship
- Missing prerequisite
- Calculation or procedure error
- Overgeneralization
- Misread question
- Unsupported guess

Then give a targeted repair. The repair may be one sentence, a contrast table, a worked step, or a pointer to the exact source passage.

### Partial answers

Typed answers can be partly right. Show rubric-level feedback rather than forcing them into correct or incorrect.

Example:

```text
2 of 3 ideas present

✓ Identified the trigger
✓ Explained the immediate effect
· Missing the limiting condition
```

### Source grounding

Every factual correction should be traceable to the attached material. The student can press a key to reveal the relevant source excerpt or location. Transfer questions should distinguish source facts from the novel scenario created for the question.

### Challenge the grader

The student can challenge an answer with one key. OpenStudy then re-evaluates the question, the student's answer, the rubric, and the source passage.

Possible outcomes:

- Grade upheld with a clearer explanation
- Partial credit granted
- Multiple answers accepted
- Question withdrawn as ambiguous
- Source material marked inconsistent

Withdrawn questions do not affect the learning record.

## The repair loop

When a meaningful gap appears, the quiz temporarily changes shape:

1. Name the gap in plain language
2. Give the smallest useful explanation
3. Ask the student to restate or apply the repaired idea
4. Move to a different topic
5. Return to the repaired idea later without warning

Immediate repetition checks short-term correction. Delayed repetition checks whether the repair survived.

This prevents the familiar pattern where a student reads an explanation, feels that it makes sense, and mistakes that feeling for learning.

## Pacing and attention

The round should respond to signs of fatigue without pretending to read the student's mind.

Observable signals include:

- Several rushed errors
- Rapid confidence changes
- Repeated hint use
- Slower responses across otherwise similar questions
- Skipping explanations

When these cluster, OpenStudy can offer a concrete choice:

```text
Your last three answers were faster and less accurate.

b  take a two-minute break
s  switch to a lighter review
c  continue at the current intensity
```

No streak punishment. No guilt. A break is a study action.

## Round completion

A round ends for one of four reasons:

- Enough evidence exists for the selected concepts
- The chosen time budget has ended
- The student stops
- The remaining concepts depend on material the student has not learned yet

The end screen is a debrief, not a trophy screen.

### Debrief hierarchy

1. **What changed**
   - Concepts that moved to a stronger state
   - Misconceptions repaired
   - Skills proven through transfer

2. **What remains uncertain**
   - Fragile concepts
   - Untested concepts
   - Answers that depended on hints

3. **Confidence calibration**
   - Where confidence matched performance
   - Where the student was confidently wrong
   - Where they knew more than they trusted

4. **Recommended next action**
   - Review one source section
   - Start a targeted repair round
   - Start a fresh transfer round
   - Return later for spaced review
   - Move on because the material is secure

### Choices at the end

- **Restart this round**: same questions and structure, useful for immediate fluency
- **Fresh round**: new questions covering the same concept set
- **Repair weak spots**: questions selected only from fragile and misunderstood concepts
- **Raise the level**: move from recall toward application and transfer
- **Exam simulation**: no hints or immediate feedback, fixed time, debrief at the end
- **Schedule review**: save the next recommended review time
- **Return to session**

## Fresh rounds

A fresh round should not mean “ask the model for another random batch.” It inherits the learner model.

It should:

- Avoid repeating question wording and surface scenarios
- Revisit weak concepts through a different question form
- Reduce coverage of concepts already secure at multiple depths
- Include delayed retests of repaired misconceptions
- Increase transfer depth when recall is secure
- Preserve source grounding

The student can choose the round's purpose with one key:

```text
n  balanced new round
w  weak spots only
u  raise difficulty
t  transfer problems
e  exam simulation
```

## Long-term memory

Quiz mode should remember evidence across sessions.

For each concept, OpenStudy stores:

- Evidence events, not just a single mastery score
- Last successful unaided recall
- Last successful transfer
- Known misconceptions
- Confidence calibration
- Hint dependence
- Review history

When a learner returns days later, the opening question should test retrieval before showing the old explanation. Review timing should respond to actual performance rather than follow a fixed schedule blindly.

The learner owns this record. It stays local, remains inspectable, and can be reset per concept, material, subject, or entirely.

## Terminal experience

The interface should remain calm and keyboard-first. It should use available space to explain the learning state, not decorate it.

### Active question layout

On a normal terminal:

```text
Quiz                                     Cell division · Application
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Question 6 · evidence round

A cell completes DNA replication, but spindle fibers fail to attach.
Which checkpoint prevents progression, and why?

> Type your reasoning here...

confidence: [unsure]  think so   certain

1-3 confidence   enter submit   h hint   x challenge source

Progress  ███████░░░░  4 secure · 2 developing · 1 misunderstood
```

The question remains the focal point. Topic, depth, confidence, hints, and learning-state progress are visible but quiet.

### Wide terminal

The existing right sidebar can show a live concept map:

```text
CONCEPT EVIDENCE

DNA replication       secure
Cell-cycle checkpoints developing
Spindle attachment    misunderstood
Mitosis sequence      untested

ROUND
8 questions answered
2 repairs completed
1 concept awaiting retest
```

This replaces generic quiz statistics. It tells the student what the system currently believes and makes adaptation legible.

### Small terminal

Keep only:

- Question
- Answer control
- Confidence
- Essential feedback
- One-line progress state

Concept detail moves to a temporary `m` view. Nothing required for answering should live only in the sidebar.

## Key states

### Mapping material

OpenStudy identifies concepts, prerequisites, source quality, and possible assessment forms. Show what it is doing in concrete terms:

> Mapping 12 concepts and their prerequisites...

### Ready

Show the round briefing and estimated duration. The student starts with Enter.

### Answering

Question, response control, confidence, optional hint, and quiet progress.

### Evaluating

Lock the answer briefly and show that OpenStudy is checking it against a rubric and source. Do not fake streaming feedback.

### Repairing

Show the diagnosed gap, targeted explanation, and proof question.

### Challenging

Show the answer, rubric, and source together. Let the student state why the grade is wrong.

### Paused

Preserve the exact state. Show elapsed break time only if useful. Resume with one key.

### Complete

Show the debrief and next actions. Preserve enough detail to inspect every answer.

### Source problem

If the material is incomplete, contradictory, unreadable, or too shallow to support a reliable quiz, say so before generating confident-looking questions.

## Trust rules

- Never invent source facts to make a question harder.
- Never count an ambiguous question against the student.
- Never equate seeing an explanation with learning it.
- Never treat multiple choice as proof of recall.
- Never hide why the next question was chosen.
- Never use a score as the sole description of progress.
- Never punish breaks, retries, hints, or challenges.
- Never claim certainty about the learner from one answer.

## What success looks like

The mode succeeds when a student can answer these questions after a round:

- What do I know securely?
- What am I only recognizing?
- What misconception was holding me back?
- Can I use this knowledge outside the example I studied?
- What should I review next?
- When should I test myself again?

The strongest product signal is not a high completion rate. It is that students return, retrieve an idea without support, and discover that an earlier repair held.

## Recommended build sequence

### Foundation

- Adaptive question count
- Balanced answer positions
- Topic and difficulty metadata
- Confidence capture
- Error classification
- Same-round restart and fresh-round generation
- Evidence-based debrief

### Depth

- Free recall and short-answer grading
- Rubric-based partial credit
- Progressive hints
- Repair questions
- Delayed retests
- Source citations and answer challenges

### Learner model

- Concept extraction and prerequisite graph
- Evidence history per concept
- Cross-session retention
- Weak-spot and transfer rounds
- Review timing

### Full experience

- Exam simulation
- Time-budgeted rounds
- Attention-aware pacing
- Concept map sidebar
- Inspectable learning history
- Exportable study plan

## Open design questions

These deserve prototypes rather than abstract debate:

- How should confidence input fit into the answer flow without becoming repetitive?
- How much of the learner model should remain visible during a question?
- What is the shortest useful repair interaction for a terminal?
- How should typed-answer grading communicate uncertainty without feeling evasive?
- When should OpenStudy interrupt the round for a missing prerequisite?
- Which concept evidence belongs to the material, the subject, or the learner globally?
