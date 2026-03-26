export default function Ornament({ style }) {
  return (
    <div className="ornament" style={style} aria-hidden="true">
      <div className="ornament-line" />
      <span
        className="islamic-star"
        style={{ width: 14, height: 14 }}
      />
      <div className="ornament-line" />
    </div>
  )
}
