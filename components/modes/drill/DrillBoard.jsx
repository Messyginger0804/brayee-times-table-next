import Keypad from '../../game/Keypad';
import QuestionCard from '../../game/QuestionCard';
import AttemptHints from '../../game/AttemptHints';

export default function DrillBoard({ current, answer, setAnswer, status, hint, attemptSummaries, submit }) {
  return (
    <>
      <div className="flex flex-1 flex-col items-center justify-center gap-2 sm:pt-4">
        <QuestionCard id={current.id} problem={current.problem} answer={current.answer} typed={answer} status={status} />
        <AttemptHints problemId={current.id} attemptSummaries={attemptSummaries} hidden={!!status} />
      </div>
      <div className="flex flex-col items-center gap-2 pt-2">
        <p className="min-h-[1.5rem] text-body font-bold text-neon-amber" role="status">{hint}</p>
        <Keypad value={answer} onChange={setAnswer} onSubmit={submit} disabled={!!status} />
      </div>
    </>
  );
}
