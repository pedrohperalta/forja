# Training Configuration Feature

## Raw Idea
A training configuration feature where users can create, edit, and remove training days, exercises from each training day, repetitions, images, rest time, and every other parameter needed when training changes over time.

## Key Decisions from Discovery
- **Plan count**: Flexible — any number of training days (no longer fixed A/B/C)
- **Exercise source**: Fully custom — users type in whatever exercise name they want
- **Images**: Equipment photos per exercise (existing camera feature)
- **Parameters per exercise**: Name, sets, reps, rest time, category, equipment
- **Navigation**: Dedicated config screen ("Meus Treinos") accessible from home
- **History**: Immutable — past workouts reflect the plan as it was at completion time
- **Storage**: Local only, no S3 sync
