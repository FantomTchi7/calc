'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './calculator.module.css';
import { create, all, isBigNumber as mathIsBigNumber, isUnit as mathIsUnit, format as mathFormat, MathJsStatic } from 'mathjs';

const mathjs: MathJsStatic = create(all);
mathjs.config({ number: 'BigNumber', precision: 64 });

// Ensure String.prototype.lastIndexOfAny is defined globally when the module loads
if (typeof String.prototype.lastIndexOfAny === 'undefined') {
  String.prototype.lastIndexOfAny = function(this: string, chars: string[]): number {
    let lastIndex = -1;
    for (const char of chars) {
      const index = this.lastIndexOf(char);
      if (index > lastIndex) {
        lastIndex = index;
      }
    }
    return lastIndex;
  };
}

const PHYSICAL_CONSTANTS_DEFINITIONS = {
  speedOfLight: { display: 'c', value: 'speedOfLight', title: "Speed of Light (c₀)" },
  gravitationConstant: { display: 'G', value: 'gravitationConstant', title: "Gravitational Constant" },
  planckConstant: { display: 'h', value: 'planckConstant', title: "Planck Constant" },
  hBar: { display: 'ħ', value: 'hBar', title: "Reduced Planck Constant (h-bar)" },
  elementaryCharge: { display: 'qₑ', value: 'elementaryCharge', title: "Elementary Charge" },
  gravity: { display: 'g', value: 'gravity', title: "Standard Earth Gravity (approx. 9.80665 m/s²)" },
  boltzmannConstant: { display: 'k', value: 'boltzmannConstant', title: "Boltzmann Constant" },
};

const buttonLayout = [
  // Row 1
  { display: 'Rad', value: 'RAD', type: 'mode' },
  { display: 'Deg', value: 'DEG', type: 'mode' },
  { display: 'x!', value: '!', type: 'functionPostfix' },
  { display: '(', value: '(', type: 'operator' },
  { display: ')', value: ')', type: 'operator' },
  { display: '^', value: '^', type: 'operator' },
  { display: '%', value: '%', type: 'operator' },
  // Row 2
  { ...PHYSICAL_CONSTANTS_DEFINITIONS.speedOfLight, type: 'constant', className: styles.function },
  { ...PHYSICAL_CONSTANTS_DEFINITIONS.gravitationConstant, type: 'constant', className: styles.function },
  { ...PHYSICAL_CONSTANTS_DEFINITIONS.planckConstant, type: 'constant', className: styles.function },
  { ...PHYSICAL_CONSTANTS_DEFINITIONS.hBar, type: 'constant', className: styles.function },
  { ...PHYSICAL_CONSTANTS_DEFINITIONS.elementaryCharge, type: 'constant', className: styles.function },
  // Row 3
  { display: 'sin', value: 'sin(', type: 'functionPrefix' },
  { display: 'ln', value: 'log(', type: 'functionPrefix' },
  { display: '7', value: '7', type: 'number' },
  { display: '8', value: '8', type: 'number' },
  { display: '9', value: '9', type: 'number' },
  // Row 4
  { display: 'cos', value: 'cos(', type: 'functionPrefix' },
  { display: 'log₁₀', value: 'log10(', type: 'functionPrefix' },
  { display: '4', value: '4', type: 'number' },
  { display: '5', value: '5', type: 'number' },
  { display: '6', value: '6', type: 'number' },
  // Row 5
  { display: 'tan', value: 'tan(', type: 'functionPrefix' },
  { display: '√', value: 'sqrt(', type: 'functionPrefix' },
  { display: '1', value: '1', type: 'number' },
  { display: '2', value: '2', type: 'number' },
  { display: '3', value: '3', type: 'number' },
  // Row 6
  { display: 'e', value: 'e', type: 'constant', title: "Euler's Number" },
  { display: 'π', value: 'pi', type: 'constant', title: "Pi" },
  { display: '0', value: '0', type: 'number' },
  { display: '.', value: '.', type: 'number' },
  { display: 'EXP', value: 'e+', type: 'operator' },
  // Row 7
  { display: 'AC', value: 'AC', type: 'clear', className: styles.clear },
  { display: 'DEL', value: 'DEL', type: 'delete', className: styles.clear },
  { ...PHYSICAL_CONSTANTS_DEFINITIONS.gravity, type: 'constant', className: styles.function },
  { display: '/', value: '/', type: 'operator', className: styles.operator },
  { display: '*', value: '*', type: 'operator', className: styles.operator },
  // Row 8
  { display: '+/-', value: '+/-', type: 'toggleSign' },
  { ...PHYSICAL_CONSTANTS_DEFINITIONS.boltzmannConstant, type: 'constant', className: styles.function },
  { display: '-', value: '-', type: 'operator', className: styles.operator },
  { display: '+', value: '+', type: 'operator', className: styles.operator },
  { display: '=', value: '=', type: 'equals', className: styles.equals },
];


export default function CalculatorPage() {
  const [input, setInput] = useState<string>('');
  const [previousInput, setPreviousInput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isRadians, setIsRadians] = useState<boolean>(true);

  const preprocessExpression = useCallback((expr: string): string => {
    let processedExpr = expr;
    processedExpr = processedExpr.replace(/(\d+(\.\d+)?)%/g, (match, p1) => `(${p1}/100)`);
    return processedExpr;
  }, []);

  const calculateResult = useCallback(() => {
    if (!input) return;

    let expressionToEvaluate = preprocessExpression(input);
    try {
      const scope: any = {};
      if (!isRadians) {
          const degToRad = (degrees: number) => degrees * (Math.PI / 180);
          const radToDeg = (radians: number) => radians * (180 / Math.PI);

          scope.sin = (x: number | any) => mathjs.sin(mathIsUnit(x) && x.hasBase('ANGLE') ? x : degToRad(Number(x)));
          scope.cos = (x: number | any) => mathjs.cos(mathIsUnit(x) && x.hasBase('ANGLE') ? x : degToRad(Number(x)));
          scope.tan = (x: number | any) => mathjs.tan(mathIsUnit(x) && x.hasBase('ANGLE') ? x : degToRad(Number(x)));
          scope.asin = (x: number | any) => radToDeg(mathjs.asin(Number(x)));
          scope.acos = (x: number | any) => radToDeg(mathjs.acos(Number(x)));
          scope.atan = (x: number | any) => radToDeg(mathjs.atan(Number(x)));
          scope.atan2 = (y: number | any, x: number | any) => radToDeg(mathjs.atan2(Number(y), Number(x)));
      }

      let resultRaw = mathjs.evaluate(expressionToEvaluate, scope);
      let resultString: string;

      if (mathIsUnit(resultRaw)) {
        resultString = resultRaw.toString();
      } else if (mathIsBigNumber(resultRaw)) {
        resultString = resultRaw.toSignificantDigits(15).toString();
      } else if (typeof resultRaw === 'number') {
        resultString = mathFormat(resultRaw, { precision: 15, notation: 'auto' });
      } else if (typeof resultRaw === 'boolean' || resultRaw === null || resultRaw === undefined) {
        resultString = String(resultRaw);
      } else {
        resultString = mathFormat(resultRaw);
      }
      
      setPreviousInput(input + ' =');
      setInput(resultString);
      setError('');
    } catch (e: any) {
      setError('Error: ' + (e.message || 'Invalid Expression'));
      setPreviousInput(input + ' =');
    }
  }, [input, isRadians, preprocessExpression, setInput, setPreviousInput, setError]);

  const handleButtonClick = useCallback((value: string, type: string) => {
    setError(''); 

    if (type === 'number' || type === 'constant' || type === 'operator' || type === 'functionPrefix' || type === 'functionPostfix') {
      if (value === '.' && input.slice(input.lastIndexOfAny(['+', '-', '*', '/', '(', '^', '%', 'e']) + 1).includes('.')) {
        return;
      }
      setInput(prev => prev + value);
    } else if (type === 'equals') {
      calculateResult();
    } else if (type === 'clear') {
      setInput('');
      setPreviousInput('');
      setError('');
    } else if (type === 'delete') {
      setInput(prev => prev.slice(0, -1));
    } else if (type === 'mode') {
      setIsRadians(value === 'RAD');
    } else if (type === 'toggleSign') {
      if (input.startsWith('-')) {
        setInput(prev => prev.substring(1));
      } else {
        if (input.length === 0 || ['+','*','/','(','^', 'e'].includes(input.slice(-1))) {
          if (input.slice(-1).toLowerCase() === 'e' && !input.slice(-2,-1).match(/[0-9]/) ) {
             setInput(prev => prev + '-');
          } else {
             setInput(prev => prev + '-');
          }
        } else if (input.slice(-1) === '-') {
          // Avoid '5--'
        } else {
          setInput(prev => `negate(${prev})`);
        }
      }
    }
  }, [input, calculateResult, setError, setInput, setPreviousInput, setIsRadians]);
  
  // Removed the useEffect that defined String.prototype.lastIndexOfAny

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;
      let R_handled = false; // R_ to avoid conflict with any potential global 'handled'

      if (key >= '0' && key <= '9') {
        handleButtonClick(key, 'number'); R_handled = true;
      } else if (key === '.') {
        handleButtonClick(key, 'number'); R_handled = true;
      } else if (['+', '-', '*', '/','^','%'].includes(key)) {
        handleButtonClick(key, 'operator'); R_handled = true;
      } else if (key === 'Enter' || key === '=') {
        calculateResult(); R_handled = true;
      } else if (key === 'Backspace') {
        handleButtonClick('', 'delete'); R_handled = true;
      } else if (key === 'Escape') {
        handleButtonClick('', 'clear'); R_handled = true;
      } else if (key === '(' || key === ')') {
        handleButtonClick(key, 'operator'); R_handled = true;
      } else if (key.toLowerCase() === 'p' && (event.ctrlKey || event.metaKey)) { 
         handleButtonClick('pi', 'constant'); R_handled = true;
      } else if (key.toLowerCase() === 'e' && (event.ctrlKey || event.metaKey)) {
         handleButtonClick('e', 'constant'); R_handled = true;
      }

      if (R_handled) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleButtonClick, calculateResult]); // Dependencies are memoized functions

  return (
    <div className={styles.calculator}>
      <div className={styles.display}>
        <div className={styles.previousInput}>{error ? '' : previousInput}</div>
        <div className={error ? styles.error : styles.currentInput}>
          {error || input || '0'}
        </div>
      </div>

      <div className={styles.radDegToggle}>
        <button 
          onClick={() => handleButtonClick('RAD', 'mode')}
          className={isRadians ? styles.active : ''}
        >
          Rad
        </button>
        <button 
          onClick={() => handleButtonClick('DEG', 'mode')}
          className={!isRadians ? styles.active : ''}
        >
          Deg
        </button>
      </div>

      <div className={styles.buttons}>
        {buttonLayout.map((btn, index) => {
          if (btn.type === 'mode') return null; 

          let buttonClass = styles.button;
          if (btn.type === 'operator' || btn.type === 'functionPostfix') buttonClass += ` ${styles.operator}`;
          if (btn.type === 'functionPrefix' || btn.type === 'constant') buttonClass += ` ${styles.function}`;
          if (btn.type === 'equals') buttonClass += ` ${styles.equals}`;
          if (btn.type === 'clear' || btn.type === 'delete') buttonClass += ` ${styles.clear}`;
          
          return (
            <button
              key={`${btn.value}-${index}`}
              className={`${buttonClass} ${btn.className || ''}`}
              onClick={() => handleButtonClick(btn.value, btn.type)}
              title={btn.title || btn.display}
              style={btn.display === '=' ? { gridColumn: 'span 2'} : {}}
            >
              {btn.display}
            </button>
          );
        })}
      </div>
    </div>
  );
}

declare global {
  interface String {
    lastIndexOfAny(chars: string[]): number;
  }
}