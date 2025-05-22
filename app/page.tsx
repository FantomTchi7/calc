import "material-symbols";

export default function Home() {
  return (
    <div>
      <main>
        <h1>Calc</h1>

        <div className="grid grid-cols-5 grid-rows-6">
          <input type="text" name="mainInput" id="mainInput" className="row-1 col-span-full" />
          <input type="button" value="7" className="row-3 font-bold" />
          <input type="button" value="8" className="row-3 font-bold" />
          <input type="button" value="9" className="row-3 font-bold" />
          <input type="button" value="4" className="row-4 font-bold" />
          <input type="button" value="5" className="row-4 font-bold" />
          <input type="button" value="6" className="row-4 font-bold" />
          <input type="button" value="1" className="row-5 font-bold" />
          <input type="button" value="2" className="row-5 font-bold" />
          <input type="button" value="3" className="row-5 font-bold" />
          <input type="button" value="0" className="row-6 font-bold" />
          <input type="button" value="," className="row-6 font-bold" />
          <input type="button" value="backspace" className="row-6 font-bold" />
          <input type="button" value="÷" className="row-3 font-bold" />
          <input type="button" value="×" className="row-4 font-bold" />
          <input type="button" value="-" className="row-5 font-bold" />
          <input type="button" value="+" className="row-6 font-bold" />
          <input type="button" value="AC" className="row-3 font-bold" />
          <input type="button" value="( )" className="row-4 font-bold" />
          <input type="button" value="%" className="row-5 font-bold" />
          <input type="button" value="=" className="row-6 font-bold" />
        </div>
      </main>
    </div>
  );
}
