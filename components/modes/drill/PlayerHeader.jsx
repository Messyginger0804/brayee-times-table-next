import Header from '../../Header';

export default function PlayerHeader({ user, onReset }) {
  return <Header onReset={onReset} userName={user?.name} userImage={user?.image} />;
}
