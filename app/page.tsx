'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './calculator.module.css';
import { create, all, isBigNumber as mathIsBigNumber, isUnit as mathIsUnit, format as mathFormat, MathJsStatic, BigNumber as MathJsBigNumber, Unit as MathJsUnit } from 'mathjs';

const mathjs: MathJsStatic = create(all);
mathjs.config({ number: 'BigNumber', precision: 64 });

// --- CURRENCY DEFINITIONS ---
const CURRENCY_DEFINITIONS: Record<string, { definition: string, display: string, title: string, precision?: number }> = {
  USD: { definition: '1 USD', display: 'USD', title: 'US Dollar', precision: 2 }, // Base currency
  EUR: { definition: '1.08 USD', display: 'EUR', title: 'Euro (1 EUR = 1.08 USD)', precision: 2 },
  GBP: { definition: '1.27 USD', display: 'GBP', title: 'British Pound (1 GBP = 1.27 USD)', precision: 2 },
  JPY: { definition: '0.0067 USD', display: 'JPY', title: 'Japanese Yen (1 JPY = 0.0067 USD)', precision: 0 },
  CNY: { definition: '0.138 USD', display: 'CNY', title: 'Chinese Yuan (1 CNY = 0.138 USD)', precision: 2 },
  INR: { definition: '0.012 USD', display: 'INR', title: 'Indian Rupee (1 INR = 0.012 USD)', precision: 2 },
  CAD: { definition: '0.73 USD', display: 'CAD', title: 'Canadian Dollar (1 CAD = 0.73 USD)', precision: 2 },
  AUD: { definition: '0.65 USD', display: 'AUD', title: 'Australian Dollar (1 AUD = 0.65 USD)', precision: 2 },
  CHF: { definition: '1.10 USD', display: 'CHF', title: 'Swiss Franc (1 CHF = 1.10 USD)', precision: 2 },
  NZD: { definition: '0.61 USD', display: 'NZD', title: 'New Zealand Dollar (1 NZD = 0.61 USD)', precision: 2 },
  SGD: { definition: '0.74 USD', display: 'SGD', title: 'Singapore Dollar (1 SGD = 0.74 USD)', precision: 2 },
  HKD: { definition: '0.128 USD', display: 'HKD', title: 'Hong Kong Dollar (1 HKD = 0.128 USD)', precision: 2 },
  // Added currencies
  RUB: { definition: '0.011 USD', display: 'RUB', title: 'Russian Ruble (1 RUB ≈ 0.011 USD)', precision: 3 },
  BRL: { definition: '0.20 USD', display: 'BRL', title: 'Brazilian Real (1 BRL ≈ 0.20 USD)', precision: 2 },
  ZAR: { definition: '0.053 USD', display: 'ZAR', title: 'South African Rand (1 ZAR ≈ 0.053 USD)', precision: 3 },
  MXN: { definition: '0.058 USD', display: 'MXN', title: 'Mexican Peso (1 MXN ≈ 0.058 USD)', precision: 3 },
  TRY: { definition: '0.031 USD', display: 'TRY', title: 'Turkish Lira (1 TRY ≈ 0.031 USD)', precision: 3 },
  SEK: { definition: '0.095 USD', display: 'SEK', title: 'Swedish Krona (1 SEK ≈ 0.095 USD)', precision: 3 },
  NOK: { definition: '0.093 USD', display: 'NOK', title: 'Norwegian Krone (1 NOK ≈ 0.093 USD)', precision: 3 },
  DKK: { definition: '0.145 USD', display: 'DKK', title: 'Danish Krone (1 DKK ≈ 0.145 USD)', precision: 3 },
  PLN: { definition: '0.25 USD', display: 'PLN', title: 'Polish Zloty (1 PLN ≈ 0.25 USD)', precision: 2 },
};

for (const [unitSymbol, def] of Object.entries(CURRENCY_DEFINITIONS)) {
  if (unitSymbol === 'USD') {
    mathjs.createUnit(unitSymbol, { aliases: [unitSymbol.toLowerCase()] });
  } else {
    mathjs.createUnit(unitSymbol, { definition: def.definition, aliases: [unitSymbol.toLowerCase()] });
  }
}

// --- OTHER UNIT DEFINITIONS ---
const UNIT_DEFINITIONS: Record<string, { definition?: string, aliases?: string[] }> = {
  // Mass
  'g': { aliases: ['gram'] },
  'kg': { definition: '1000 g', aliases: ['kilogram'] },
  'mg': { definition: '0.001 g', aliases: ['milligram'] },
  'lb': { definition: '0.45359237 kg', aliases: ['poundmass', 'lbs'] }, // mass
  'oz': { definition: '0.0625 lb', aliases: ['ouncemass', 'ounce'] }, // mass (1/16 lb)

  // Distance
  'm': { aliases: ['meter'] },
  'km': { definition: '1000 m', aliases: ['kilometer'] },
  'cm': { definition: '0.01 m', aliases: ['centimeter'] },
  'mm': { definition: '0.001 m', aliases: ['millimeter'] },
  'ft': { definition: '0.3048 m', aliases: ['foot', 'feet'] },
  'in': { definition: '0.0254 m', aliases: ['inch', 'inches'] }, // 2.54 cm
  'mi': { definition: '1609.344 m', aliases: ['mile', 'miles'] },
  'yd': { definition: '3 ft', aliases: ['yard', 'yards'] },
};

for (const [unitSymbol, def] of Object.entries(UNIT_DEFINITIONS)) {
  mathjs.createUnit(unitSymbol, def.definition ? { definition: def.definition, aliases: def.aliases } : { aliases: def.aliases }, { override: true });
}


const findLastIndexOfAny = (str: string, chars: string[]): number => {
  let lastIndex = -1;
  for (const char of chars) {
    const index = str.lastIndexOf(char);
    if (index > lastIndex) {
      lastIndex = index;
    }
  }
  return lastIndex;
};

const PHYSICAL_CONSTANTS_DEFINITIONS = {
  speedOfLight: { display: 'c', value: 'speedOfLight', title: "Speed of Light (c₀)" },
  gravitationConstant: { display: 'G', value: 'gravitationConstant', title: "Gravitational Constant" },
  planckConstant: { display: 'h', value: 'planckConstant', title: "Planck Constant" },
  hBar: { display: 'ħ', value: 'hBar', title: "Reduced Planck Constant (h-bar)" },
  elementaryCharge: { display: 'qₑ', value: 'elementaryCharge', title: "Elementary Charge" },
  gravity: { display: 'g', value: 'gravity', title: "Standard Earth Gravity (approx. 9.80665 m/s²)" },
  boltzmannConstant: { display: 'k', value: 'boltzmannConstant', title: "Boltzmann Constant" },
};

type CalculatorType = 'GENERIC' | 'PHYSICS' | 'PROGRAMMING' | 'ECONOMICS';
type CalculatorMode = 'RAD' | 'DEG';
type NumberBase = 'BIN' | 'OCT' | 'DEC' | 'HEX';

type ButtonType = 
  | 'operator' 
  | 'clear' 
  | 'delete' 
  | 'hexDigit' 
  | 'functionPostfix' 
  | 'constant' 
  | 'functionPrefix' 
  | 'number' 
  | 'equals' 
  | 'toggleSign'
  | 'mode' 
  | 'baseMode'
  | 'unit';

interface ButtonConfig {
  display: string;
  value: string;
  type: ButtonType;
  className?: string;
  title?: string;
  base?: NumberBase; 
  style?: React.CSSProperties;
}

const genericButtonLayout: ButtonConfig[] = [
    // Row 1
    { display: 'AC', value: 'AC', type: 'clear', className: styles.clear },
    { display: 'DEL', value: 'DEL', type: 'delete', className: styles.clear },
    { display: '(', value: '(', type: 'operator' },
    { display: ')', value: ')', type: 'operator' },
    { display: '%', value: '%', type: 'operator' },
    { display: '/', value: '/', type: 'operator', className: styles.operator },
    // Row 2
    { display: 'sin', value: 'sin(', type: 'functionPrefix' },
    { display: 'cos', value: 'cos(', type: 'functionPrefix' },
    { display: 'tan', value: 'tan(', type: 'functionPrefix' },
    { display: '7', value: '7', type: 'number' },
    { display: '8', value: '8', type: 'number' },
    { display: '9', value: '9', type: 'number' },
    // Row 3
    { display: 'ln', value: 'log(', type: 'functionPrefix' },
    { display: 'log₁₀', value: 'log10(', type: 'functionPrefix' },
    { display: 'x!', value: '!', type: 'functionPostfix' },
    { display: '4', value: '4', type: 'number' },
    { display: '5', value: '5', type: 'number' },
    { display: '6', value: '6', type: 'number' },
    // Row 4
    { display: '√', value: 'sqrt(', type: 'functionPrefix' },
    { display: '^', value: '^', type: 'operator', title: 'Power' },
    { display: 'EXP', value: 'e', type: 'operator' , title: 'Exponent (for scientific notation like 2.5e3)'}, 
    { display: '1', value: '1', type: 'number' },
    { display: '2', value: '2', type: 'number' },
    { display: '3', value: '3', type: 'number' },
    // Row 5
    { display: 'π', value: 'pi', type: 'constant', title: "Pi" },
    { display: 'e', value: 'e', type: 'constant', title: "Euler's Number" },
    { display: '+/-', value: '+/-', type: 'toggleSign' },
    { display: '0', value: '0', type: 'number', style: { gridColumn: 'span 2'} },
    { display: '.', value: '.', type: 'number' },
    // Row 6
    { display: '*', value: '*', type: 'operator', className: styles.operator, style: { gridColumn: 'span 1'} },
    { display: '-', value: '-', type: 'operator', className: styles.operator, style: { gridColumn: 'span 1'} },
    { display: '+', value: '+', type: 'operator', className: styles.operator, style: { gridColumn: 'span 2'} },
    { display: '=', value: '=', type: 'equals', className: styles.equals, style: { gridColumn: 'span 2'} },
];

// Unit Button Definitions for Physics Calculator
const distanceUnitButtons: ButtonConfig[] = [
  { display: 'm', value: 'm', title: 'Meter', type: 'unit' },
  { display: 'cm', value: 'cm', title: 'Centimeter', type: 'unit' },
  { display: 'km', value: 'km', title: 'Kilometer', type: 'unit' },
  { display: 'ft', value: 'ft', title: 'Foot', type: 'unit' },
  { display: 'in', value: 'in', title: 'Inch', type: 'unit' },
  { display: 'mi', value: 'mi', title: 'Mile', type: 'unit' },
];
const massUnitButtons: ButtonConfig[] = [
  { display: 'g', value: 'g', title: 'Gram', type: 'unit' },
  { display: 'kg', value: 'kg', title: 'Kilogram', type: 'unit' },
  { display: 'lb', value: 'lb', title: 'Pound (mass)', type: 'unit' },
  { display: 'oz', value: 'oz', title: 'Ounce (mass)', type: 'unit' },
];
const weightForceUnitButtons: ButtonConfig[] = [
  { display: 'N', value: 'N', title: 'Newton (force)', type: 'unit' },
  { display: 'lbf', value: 'lbf', title: 'Pound-force', type: 'unit' },
];
const temperatureUnitButtons: ButtonConfig[] = [
  { display: 'K', value: 'K', title: 'Kelvin', type: 'unit' },
  { display: '°C', value: 'degC', title: 'Celsius', type: 'unit' },
  { display: '°F', value: 'degF', title: 'Fahrenheit', type: 'unit' },
];
const toUnitButton: ButtonConfig = { display: 'to', value: ' to ', type: 'operator', title: 'Convert unit (e.g. 10 m to ft)' };

const physicsButtonLayout: ButtonConfig[] = [
    // Row 1: Functions (populated by items moved from old R2 and R4)
    { display: 'sin', value: 'sin(', type: 'functionPrefix' },
    { display: 'cos', value: 'cos(', type: 'functionPrefix' },
    { display: 'tan', value: 'tan(', type: 'functionPrefix' },
    { display: '^', value: '^', type: 'operator', title: 'Power' },
    { display: '√', value: 'sqrt(', type: 'functionPrefix' },
    { display: 'x!', value: '!', type: 'functionPostfix' },
    // Row 2: Functions & Constants (populated by items from old R2 and R4)
    { display: 'ln', value: 'log(', type: 'functionPrefix' },
    { display: 'log₁₀', value: 'log10(', type: 'functionPrefix' },
    { ...PHYSICAL_CONSTANTS_DEFINITIONS.boltzmannConstant, type: 'constant', className: styles.function }, // k
    { display: 'e', value: 'e', type: 'constant', title: "Euler's Number" },
    { display: 'π', value: 'pi', type: 'constant', title: "Pi" },
    { display: ' ', value: ' ', type: 'operator', style: { visibility: 'hidden' } }, // Placeholder for layout if needed
    // Row 3: Physical Constants
    { ...PHYSICAL_CONSTANTS_DEFINITIONS.speedOfLight, type: 'constant', className: styles.function },
    { ...PHYSICAL_CONSTANTS_DEFINITIONS.gravitationConstant, type: 'constant', className: styles.function },
    { ...PHYSICAL_CONSTANTS_DEFINITIONS.planckConstant, type: 'constant', className: styles.function },
    { ...PHYSICAL_CONSTANTS_DEFINITIONS.hBar, type: 'constant', className: styles.function },
    { ...PHYSICAL_CONSTANTS_DEFINITIONS.elementaryCharge, type: 'constant', className: styles.function },
    { ...PHYSICAL_CONSTANTS_DEFINITIONS.gravity, type: 'constant', className: styles.function }, // g
    // Row 4: Distance Units (was Row 5)
    ...distanceUnitButtons,
    // Row 5: Mass & Weight/Force Units (was Row 6)
    ...massUnitButtons, ...weightForceUnitButtons.slice(0,2), // g, kg, lb, oz, N, lbf
    // Row 6: Temperature Units & Conversion (was Row 7)
    ...temperatureUnitButtons, 
    toUnitButton,
    { display: '+/-', value: '+/-', type: 'toggleSign' },
    { display: '.', value: '.', type: 'number' }, 
    // --- Start of Numpad and Core Operators Area (New Rows 7-10, effectively shifting old numpad down and restructuring) ---
    // Row 7 (New Numpad Row 1)
    { display: '7', value: '7', type: 'number' },
    { display: '8', value: '8', type: 'number' },
    { display: '9', value: '9', type: 'number' },
    { display: 'DEL', value: 'DEL', type: 'delete', className: styles.clear }, // Moved from original Row 1
    { display: 'AC', value: 'AC', type: 'clear', className: styles.clear },   // Moved from original Row 1
    { display: '(', value: '(', type: 'operator' },                            // Moved from original Row 1
    // Row 8 (New Numpad Row 2)
    { display: '4', value: '4', type: 'number' },
    { display: '5', value: '5', type: 'number' },
    { display: '6', value: '6', type: 'number' },
    { display: '/', value: '/', type: 'operator', className: styles.operator }, // Moved from original Row 1
    { display: '*', value: '*', type: 'operator', className: styles.operator }, // From original Row 8
    { display: ')', value: ')', type: 'operator' },                            // Moved from original Row 1
    // Row 9 (New Numpad Row 3)
    { display: '1', value: '1', type: 'number' },
    { display: '2', value: '2', type: 'number' },
    { display: '3', value: '3', type: 'number' },
    { display: '-', value: '-', type: 'operator', className: styles.operator }, // From original Row 9
    { display: '+', value: '+', type: 'operator', className: styles.operator }, // From original Row 9
    { display: '%', value: '%', type: 'operator' },                             // Moved from original Row 1
    // Row 10 (New Numpad Row 4)
    { display: '0', value: '0', type: 'number', style: { gridColumn: 'span 2'} }, // Span changed from 3
    { display: 'EXP', value: 'e', type: 'operator', title: 'Exponent (for scientific notation like 2.5e3)' }, // Moved from original Row 4
    { display: '=', value: '=', type: 'equals', className: styles.equals, style: { gridColumn: 'span 3'} }, // Span remains 3 (2+1+3 = 6 cols)
];


const programmingButtonLayout: ButtonConfig[] = [
    // Row 1
    { display: '(', value: '(', type: 'operator' },
    { display: ')', value: ')', type: 'operator' },
    { display: 'Lsh', value: ' << ', type: 'operator', title: 'Left Shift' },
    { display: 'Rsh', value: ' >> ', type: 'operator', title: 'Right Shift (Arithmetic)' },
    { display: 'AC', value: 'AC', type: 'clear', className: styles.clear },
    { display: 'DEL', value: 'DEL', type: 'delete', className: styles.clear },
    // Row 2
    { display: 'A', value: 'A', type: 'hexDigit', base: 'HEX' },
    { display: 'B', value: 'B', type: 'hexDigit', base: 'HEX' },
    { display: 'C', value: 'C', type: 'hexDigit', base: 'HEX' },
    { display: 'AND', value: ' and ', type: 'operator', title: 'Bitwise AND' },
    { display: '%', value: '%', type: 'operator' },
    { display: '/', value: '/', type: 'operator', className: styles.operator },
    // Row 3
    { display: 'D', value: 'D', type: 'hexDigit', base: 'HEX' }, 
    { display: 'E', value: 'E', type: 'hexDigit', base: 'HEX' }, 
    { display: 'F', value: 'F', type: 'hexDigit', base: 'HEX' },
    { display: 'OR', value: ' or ', type: 'operator', title: 'Bitwise OR' },
    { display: '^', value: '^', type: 'operator', title: 'Power' }, 
    { display: '*', value: '*', type: 'operator', className: styles.operator },
    // Row 4
    { display: '7', value: '7', type: 'number' },
    { display: '8', value: '8', type: 'number' },
    { display: '9', value: '9', type: 'number' },
    { display: 'XOR', value: ' xor ', type: 'operator', title: 'Bitwise XOR' },
    { display: '+/-', value: '+/-', type: 'toggleSign' },
    { display: '-', value: '-', type: 'operator', className: styles.operator },
    // Row 5: 4, 5, 6, NOT, +, = (with + and = spanning two rows)
    { display: '4', value: '4', type: 'number' },
    { display: '5', value: '5', type: 'number' },
    { display: '6', value: '6', type: 'number' },
    { display: 'NOT', value: '~', type: 'functionPrefix', title: 'Bitwise NOT' },
    { display: '+', value: '+', type: 'operator', className: styles.operator, style: { gridRow: 'span 2'} },
    { display: '=', value: '=', type: 'equals', className: styles.equals, style: { gridRow: 'span 2'} },
    // Row 6: 1, 2, 3, 0 (0 under NOT, then space for +, space for =)
    { display: '1', value: '1', type: 'number' },
    { display: '2', value: '2', type: 'number' },
    { display: '3', value: '3', type: 'number' },
    { display: '0', value: '0', type: 'number', style: { gridColumn: 'span 1'} }, 
];

const economicsButtonLayout: ButtonConfig[] = [
    // Row 1
    { display: 'AC', value: 'AC', type: 'clear', className: styles.clear },
    { display: 'DEL', value: 'DEL', type: 'delete', className: styles.clear },
    { display: '(', value: '(', type: 'operator' },
    { display: ')', value: ')', type: 'operator' },
    { display: '%', value: '%', type: 'operator' },
    { display: '/', value: '/', type: 'operator', className: styles.operator },
    // Row 2: Currencies
    { display: CURRENCY_DEFINITIONS.USD.display, value: 'USD', type: 'unit', title: CURRENCY_DEFINITIONS.USD.title },
    { display: CURRENCY_DEFINITIONS.EUR.display, value: 'EUR', type: 'unit', title: CURRENCY_DEFINITIONS.EUR.title },
    { display: CURRENCY_DEFINITIONS.GBP.display, value: 'GBP', type: 'unit', title: CURRENCY_DEFINITIONS.GBP.title },
    { display: CURRENCY_DEFINITIONS.JPY.display, value: 'JPY', type: 'unit', title: CURRENCY_DEFINITIONS.JPY.title },
    { display: CURRENCY_DEFINITIONS.CNY.display, value: 'CNY', type: 'unit', title: CURRENCY_DEFINITIONS.CNY.title },
    { display: CURRENCY_DEFINITIONS.INR.display, value: 'INR', type: 'unit', title: CURRENCY_DEFINITIONS.INR.title },
    // Row 3: More Currencies
    { display: CURRENCY_DEFINITIONS.CAD.display, value: 'CAD', type: 'unit', title: CURRENCY_DEFINITIONS.CAD.title },
    { display: CURRENCY_DEFINITIONS.AUD.display, value: 'AUD', type: 'unit', title: CURRENCY_DEFINITIONS.AUD.title },
    { display: CURRENCY_DEFINITIONS.CHF.display, value: 'CHF', type: 'unit', title: CURRENCY_DEFINITIONS.CHF.title },
    { display: CURRENCY_DEFINITIONS.NZD.display, value: 'NZD', type: 'unit', title: CURRENCY_DEFINITIONS.NZD.title },
    { display: CURRENCY_DEFINITIONS.SGD.display, value: 'SGD', type: 'unit', title: CURRENCY_DEFINITIONS.SGD.title },
    { display: CURRENCY_DEFINITIONS.HKD.display, value: 'HKD', type: 'unit', title: CURRENCY_DEFINITIONS.HKD.title },
    // Row 4: Added Currencies
    { display: CURRENCY_DEFINITIONS.RUB.display, value: 'RUB', type: 'unit', title: CURRENCY_DEFINITIONS.RUB.title },
    { display: CURRENCY_DEFINITIONS.BRL.display, value: 'BRL', type: 'unit', title: CURRENCY_DEFINITIONS.BRL.title },
    { display: CURRENCY_DEFINITIONS.ZAR.display, value: 'ZAR', type: 'unit', title: CURRENCY_DEFINITIONS.ZAR.title },
    { display: CURRENCY_DEFINITIONS.MXN.display, value: 'MXN', type: 'unit', title: CURRENCY_DEFINITIONS.MXN.title },
    { display: CURRENCY_DEFINITIONS.TRY.display, value: 'TRY', type: 'unit', title: CURRENCY_DEFINITIONS.TRY.title },
    { display: CURRENCY_DEFINITIONS.SEK.display, value: 'SEK', type: 'unit', title: CURRENCY_DEFINITIONS.SEK.title },
    // Row 5: More Added Currencies & Numbers
    { display: CURRENCY_DEFINITIONS.NOK.display, value: 'NOK', type: 'unit', title: CURRENCY_DEFINITIONS.NOK.title },
    { display: CURRENCY_DEFINITIONS.DKK.display, value: 'DKK', type: 'unit', title: CURRENCY_DEFINITIONS.DKK.title },
    { display: CURRENCY_DEFINITIONS.PLN.display, value: 'PLN', type: 'unit', title: CURRENCY_DEFINITIONS.PLN.title },
    { display: '7', value: '7', type: 'number' },
    { display: '8', value: '8', type: 'number' },
    { display: '9', value: '9', type: 'number' },
    // Row 6: Operators & Numbers
    toUnitButton,
    { display: '^', value: '^', type: 'operator', title: 'Power' },
    { display: '√', value: 'sqrt(', type: 'functionPrefix' },
    { display: '4', value: '4', type: 'number' },
    { display: '5', value: '5', type: 'number' },
    { display: '6', value: '6', type: 'number' },
    // Row 7: Meta-Operators & Numbers
    { display: 'EXP', value: 'e', type: 'operator', title: 'Exponent (for scientific notation like 2.5e3)' },
    { display: '+/-', value: '+/-', type: 'toggleSign' },
    { display: '.', value: '.', type: 'number' },
    { display: '1', value: '1', type: 'number' },
    { display: '2', value: '2', type: 'number' },
    { display: '3', value: '3', type: 'number' },
    // Row 8: Zero, Core Operators, Equals
    { display: '0', value: '0', type: 'number', style: { gridColumn: 'span 2'} },
    { display: '*', value: '*', type: 'operator', className: styles.operator },
    { display: '-', value: '-', type: 'operator', className: styles.operator },
    { display: '+', value: '+', type: 'operator', className: styles.operator, style: { gridColumn: 'span 1'} }, // Kept + as span 1 to fit
    { display: '=', value: '=', type: 'equals', className: styles.equals, style: { gridColumn: 'span 1'} },     // Kept = as span 1 to fit
];


const buttonLayouts: Record<CalculatorType, ButtonConfig[]> = {
  GENERIC: genericButtonLayout,
  PHYSICS: physicsButtonLayout,
  PROGRAMMING: programmingButtonLayout,
  ECONOMICS: economicsButtonLayout,
};


function getBasePrefix(base: NumberBase): string {
    switch (base) {
        case 'HEX': return '0x';
        case 'BIN': return '0b';
        case 'OCT': return '0o';
        default: return '';
    }
}

function getValidCharsForBase(base: NumberBase): string {
    switch (base) {
        case 'HEX': return 'a-f0-9';
        case 'BIN': return '01';
        case 'OCT': return '0-7';
        case 'DEC': return '0-9';
        default: return '';
    }
}

export default function CalculatorPage() {
  const [input, setInput] = useState<string>('');
  const [previousInput, setPreviousInput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [angleMode, setAngleMode] = useState<CalculatorMode>('RAD');
  const [numberBase, setNumberBase] = useState<NumberBase>('DEC');
  const [isResultInInput, setIsResultInInput] = useState<boolean>(false);
  const [calculatorType, setCalculatorType] = useState<CalculatorType>('GENERIC');

  const currentButtonLayout = buttonLayouts[calculatorType];

  const preprocessExpression = useCallback((expr: string, currentBase: NumberBase, currentCalcType: CalculatorType): string => {
    let processedExpr = expr;
    
    processedExpr = processedExpr.replace(/(\d+(?:\.\d+(?:[eE][-+]?\d+)?)?)%/g, (match, p1) => `(${p1}/100)`);
    
    processedExpr = processedExpr.replace(/\b(AND|OR|XOR)\b/g, (match) => match.toLowerCase());
    processedExpr = processedExpr.replace(/(\S)\s*(and|or|xor)\s*(\S)/g, '$1 $2 $3');
    processedExpr = processedExpr.replace(/\b(and|or|xor)\b(?![\s(])/g, '$1 ');
    processedExpr = processedExpr.replace(/(?<![\s)])\b(and|or|xor)\b/g, ' $1');


    if (currentCalcType === 'PROGRAMMING' && currentBase !== 'DEC') {
        const prefix = getBasePrefix(currentBase); 
        const validCharsPattern = getValidCharsForBase(currentBase); 
        
        const numberCandidateRegex = new RegExp(`([${validCharsPattern}]+)`, 'gi');
        
        let tempExpr = '';
        let lastIndex = 0;
        let match;

        while ((match = numberCandidateRegex.exec(processedExpr)) !== null) {
            const candidate = match[1];
            const startIndex = match.index;
            
            tempExpr += processedExpr.substring(lastIndex, startIndex);
            
            const charBefore = startIndex > 0 ? processedExpr[startIndex - 1] : null;
            const charBeforeThat = startIndex > 1 ? processedExpr[startIndex - 2] : null;
            const charAfter = startIndex + candidate.length < processedExpr.length ? processedExpr[startIndex + candidate.length] : null;

            let isAlreadyPrefixed = false;
            if (prefix && charBefore?.toLowerCase() === prefix[1] && charBeforeThat === '0') {
                 isAlreadyPrefixed = true;
            }
            
            const precededByWordChar = charBefore && /[a-z0-9_]/i.test(charBefore) && 
                                     !(charBeforeThat === '0' && charBefore?.toLowerCase() === prefix[1]); 
            const followedByWordChar = charAfter && /[a-z0-9_.]/i.test(charAfter); 
            
            const isPartOfWord = precededByWordChar || followedByWordChar;
            
            let finalCandidate = candidate;
            if (!isAlreadyPrefixed && !isPartOfWord && prefix) {
                 const lcCandidate = candidate.toLowerCase();
                 let dontPrefix = false;
                 if (lcCandidate === 'e') { 
                     if (currentBase === 'HEX' && (candidate === 'e' || candidate === 'E')) {
                         dontPrefix = false; 
                     } else {
                         dontPrefix = true;
                     }
                 } else if (lcCandidate === 'pi') { 
                     dontPrefix = true;
                 }

                 if (!dontPrefix) {
                    finalCandidate = prefix + candidate;
                 }
            }
            tempExpr += finalCandidate;
            lastIndex = numberCandidateRegex.lastIndex;
        }
        tempExpr += processedExpr.substring(lastIndex);
        processedExpr = tempExpr;
    }
    
    processedExpr = processedExpr.replace(/\s\s+/g, ' ').trim();
    return processedExpr;
  }, []);

  const formatResultValue = useCallback((val: any, base: NumberBase, configPrecision: number, currentCalcType: CalculatorType): { formatted: string, errorMsg?: string } => {
    let errorMsg: string | undefined = undefined;
    const highPrecisionOpts = { precision: configPrecision, notation: 'auto' as const };
    const stdPrecisionOpts = { precision: 15, notation: 'auto' as const };

    const targetBaseIsNonDecInteger = currentCalcType === 'PROGRAMMING' && base !== 'DEC';

    if (mathIsBigNumber(val)) {
        const bnVal = val as MathJsBigNumber;
        if (!bnVal.isInteger() && targetBaseIsNonDecInteger) {
            errorMsg = `Info: Result is not an integer. Displaying in decimal.`;
            return { formatted: mathjs.format(bnVal, highPrecisionOpts), errorMsg };
        }
        if (!bnVal.isInteger()) { 
             return { formatted: mathjs.format(bnVal, highPrecisionOpts), errorMsg };
        }
        
        const bigIntValue = BigInt(bnVal.toFixed(0));
        if (currentCalcType === 'PROGRAMMING') {
            switch (base) {
                case 'HEX': return { formatted: bigIntValue.toString(16).toUpperCase() };
                case 'BIN': return { formatted: bigIntValue.toString(2) };
                case 'OCT': return { formatted: bigIntValue.toString(8) };
                case 'DEC':
                default:    return { formatted: bigIntValue.toString(10) };
            }
        } else { 
            return { formatted: bigIntValue.toString(10) };
        }
    } else if (typeof val === 'number') {
        if (!Number.isInteger(val) && targetBaseIsNonDecInteger) {
            errorMsg = `Info: Result is not an integer. Displaying in decimal.`;
            return { formatted: mathjs.format(val, stdPrecisionOpts), errorMsg };
        }
        if (!Number.isInteger(val)) { 
            return { formatted: mathjs.format(val, stdPrecisionOpts), errorMsg };
        }

        if (currentCalcType === 'PROGRAMMING') {
            switch (base) {
                case 'HEX': return { formatted: val.toString(16).toUpperCase() };
                case 'BIN': return { formatted: val.toString(2) };
                case 'OCT': return { formatted: val.toString(8) };
                case 'DEC':
                default:    return { formatted: val.toString(10) };
            }
        } else { 
             return { formatted: val.toString(10) };
        }
    } else if (mathIsUnit(val)) {
        const unitVal = val as MathJsUnit;
        if (unitVal.units.length === 1 && CURRENCY_DEFINITIONS.hasOwnProperty(unitVal.units[0].unit.name)) {
            const currencyInfo = CURRENCY_DEFINITIONS[unitVal.units[0].unit.name];
            const precision = currencyInfo.precision !== undefined ? currencyInfo.precision : 2;
            return { formatted: mathjs.format(unitVal, { notation: 'fixed', precision: precision }), errorMsg };
        }
        if (targetBaseIsNonDecInteger) {
             errorMsg = `Info: Result has units. Base ${base} only for dimensionless integers. Displaying in decimal.`;
        }
        return { formatted: mathjs.format(unitVal, {precision: 10}), errorMsg }; 
    } else if (typeof val === 'boolean' || val === null || val === undefined) {
        return { formatted: String(val) };
    } else {
        if (targetBaseIsNonDecInteger) {
            errorMsg = `Info: Result type not directly convertible to base ${base}. Displaying in standard format.`;
        }
        return { formatted: mathjs.format(val, highPrecisionOpts), errorMsg };
    }
  }, []);
  
  const calculateResult = useCallback(() => {
    if (!input) return;

    let expressionToEvaluate = preprocessExpression(input, numberBase, calculatorType);

    try {
      const scope: Record<string, any> = {};
      if (angleMode === 'DEG' && (calculatorType === 'GENERIC' || calculatorType === 'PHYSICS' || calculatorType === 'ECONOMICS')) {
          const degToRad = (arg: number | MathJsBigNumber | MathJsUnit): number | MathJsUnit => {
            if (mathIsUnit(arg) && (arg as MathJsUnit).hasBase('ANGLE')) return arg as MathJsUnit;
            return mathjs.unit(Number(arg), 'deg').toNumber('rad');
          };
          const radToDeg = (radians: number): number => radians * (180 / Math.PI);
          
          const createTrigFunction = (mathJsFunc: Function) => (x: any) => {
            if (mathIsUnit(x) && (x as MathJsUnit).hasBase('ANGLE')) return mathJsFunc(x);
            const xInRad = degToRad(Number(x));
            return mathJsFunc(xInRad);
          };
          
          const createInverseTrigFunction = (mathJsFunc: Function) => (x: any) => {
             const resultRad = mathJsFunc(Number(x));
             return radToDeg(resultRad);
          };

          scope.sin = createTrigFunction(mathjs.sin);
          scope.cos = createTrigFunction(mathjs.cos);
          scope.tan = createTrigFunction(mathjs.tan);
          scope.asin = createInverseTrigFunction(mathjs.asin);
          scope.acos = createInverseTrigFunction(mathjs.acos);
          scope.atan = createInverseTrigFunction(mathjs.atan);
          scope.atan2 = (y: any, x: any) => radToDeg(mathjs.atan2(Number(y), Number(x)));
      }

      let resultRaw = mathjs.evaluate(expressionToEvaluate, scope);
      const { formatted: resultString, errorMsg: resultFormatError } = formatResultValue(resultRaw, numberBase, mathjs.config().precision, calculatorType);
      
      setPreviousInput(input.trim() + ' ='); 
      setInput(resultString);
      setError(resultFormatError || ''); 
      setIsResultInInput(true);
    } catch (e: any) {
      setError('Error: ' + (e.message || 'Invalid Expression'));
      setPreviousInput(input.trim() + ' ='); 
      setIsResultInInput(false);
    }
  }, [input, angleMode, numberBase, calculatorType, preprocessExpression, formatResultValue]);

  const handleCalculatorTypeChange = (newType: CalculatorType) => {
    const oldType = calculatorType;
    setCalculatorType(newType); 
    setError('');
    
    let newNumberBaseForFormatting: NumberBase;
    if (newType === 'PROGRAMMING') {
      newNumberBaseForFormatting = numberBase; 
    } else {
      newNumberBaseForFormatting = 'DEC'; 
      if (numberBase !== 'DEC') { 
        setNumberBase('DEC'); 
      }
    }
    
    if (newType === 'GENERIC' || newType === 'PHYSICS' || newType === 'ECONOMICS') {
      if(angleMode !== 'RAD' && angleMode !== 'DEG') setAngleMode('RAD');
    }

    if (input.trim()) { 
        try {
            const baseForOldContext = oldType === 'PROGRAMMING' ? numberBase : 'DEC';
            const currentVal = mathjs.evaluate(preprocessExpression(input, baseForOldContext, oldType));
            
            const {formatted: newResultString, errorMsg} = formatResultValue(
                currentVal, 
                newNumberBaseForFormatting, 
                mathjs.config().precision, 
                newType 
            );
            
            setInput(newResultString);
            setError(errorMsg || '');
            
            if (typeof currentVal === 'number' || mathIsBigNumber(currentVal) || mathIsUnit(currentVal)) {
                setIsResultInInput(true); 
            } else {
                setIsResultInInput(false); 
            }

        } catch (e) {
            setError(prev => prev || `Info: Input "${input}" could not be auto-converted for new type ${newType}. It remains as is.`);
            setIsResultInInput(false); 
        }
    } else {
        setInput(''); 
        setPreviousInput(''); 
        setIsResultInInput(false);
    }
  };


  const handleButtonClick = useCallback((value: string, type: ButtonType) => {
    setError('');
    if (isResultInInput && type !== 'mode' && type !== 'baseMode' && type !== 'equals' && type !== 'clear') {
        if (type === 'operator' || type === 'functionPostfix') {
            // Allow continuing with result
        } else if (type === 'number' || type === 'hexDigit' || type === 'constant' || type === 'functionPrefix' || type === 'unit') {
             setInput('');
        }
    }
    
    if (type !== 'equals' && type !== 'mode' && type !== 'baseMode') {
        setIsResultInInput(false);
    }

    if (type === 'number' || type === 'hexDigit' || type === 'constant' || type === 'operator' || type === 'functionPrefix' || type === 'functionPostfix' || type === 'unit') {
      if (value === '.' && calculatorType === 'PROGRAMMING' && numberBase !== 'DEC') return;
      
      const lastNumberSegment = input.substring(findLastIndexOfAny(input, ['+', '-', '*', '/', '(', '^', '%', 'e', ' ', '~', '&', '|', '<', '>', 'o']) + 1);
      if (value === '.' && lastNumberSegment.includes('.')) {
        return;
      }
      setInput(prev => prev + value);
    } else if (type === 'equals') {
      calculateResult();
    } else if (type === 'clear') {
      setInput('');
      setPreviousInput('');
      setError('');
      setIsResultInInput(false);
    } else if (type === 'delete') {
      setInput(prev => prev.slice(0, -1));
      setIsResultInInput(false);
    } else if (type === 'mode') {
      setAngleMode(value as CalculatorMode);
    } else if (type === 'baseMode') {
      const newBase = value as NumberBase;
      const oldBase = numberBase;

      if (calculatorType === 'PROGRAMMING' && input.trim() && oldBase !== newBase) {
        try {
          const expressionInOldBase = preprocessExpression(input, oldBase, calculatorType);
          const evaluatedValue = mathjs.evaluate(expressionInOldBase);

          if (mathIsBigNumber(evaluatedValue) || typeof evaluatedValue === 'number') {
            const { formatted: newInputString, errorMsg: conversionErrorMsg } = formatResultValue(
              evaluatedValue,
              newBase, 
              mathjs.config().precision,
              calculatorType
            );
            setInput(newInputString);
            setError(conversionErrorMsg || error); 
          } else {
            setError(prevError => prevError || `Info: Input "${input}" not a simple number, base changed to ${newBase}.`);
          }
        } catch (e: any) {
          console.warn(`Could not parse input "${input}" in base ${oldBase} for conversion when switching to ${newBase}:`, e);
          setError(prevError => prevError || `Info: Could not convert "${input}" from ${oldBase}. Base changed to ${newBase}. Error: ${e.message}`);
        }
      }
      setNumberBase(newBase); 

    } else if (type === 'toggleSign') {
        setInput(prev => {
            if (!prev && (calculatorType !== 'PROGRAMMING' || numberBase === 'DEC')) return '-';
            if (!prev) return prev;

            if (isResultInInput) {
                try {
                    let valToNegate;
                    try {
                        valToNegate = mathjs.evaluate(preprocessExpression(prev, numberBase, calculatorType));
                    } catch (evalError) {
                        if (typeof prev === 'string') {
                           valToNegate = mathjs.unit(prev);
                        } else {
                           throw evalError; 
                        }
                    }
                    const negatedVal = mathjs.unaryMinus(valToNegate);
                    const { formatted } = formatResultValue(negatedVal, numberBase, mathjs.config().precision, calculatorType);
                    return formatted;
                } catch (e) { 
                    setError("Error: Could not toggle sign of result.");
                    return prev; 
                }
            }
            
            const lastNumRegex = /([-+]?(?:0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\d*\.?\d+(?:[eE][-+]?\d+)?))([a-zA-Z°]*)$/;
            let match = prev.match(lastNumRegex);

            if (match) {
                const numPartStr = match[1];
                const unitPartStr = match[2] || "";
                const numStartIdx = prev.length - (numPartStr.length + unitPartStr.length);
                const beforeNum = prev.substring(0, numStartIdx);

                if (numPartStr.startsWith('-')) {
                    return beforeNum + numPartStr.substring(1) + unitPartStr;
                } else if (numPartStr.startsWith('+')) {
                    return beforeNum + '-' + numPartStr.substring(1) + unitPartStr;
                } else {
                    if (calculatorType === 'PROGRAMMING' && numberBase !== 'DEC') {
                         try {
                            const val = mathjs.evaluate(preprocessExpression(numPartStr, numberBase, calculatorType));
                            const negatedVal = mathjs.unaryMinus(val);
                            const { formatted } = formatResultValue(negatedVal, numberBase, mathjs.config().precision, calculatorType);
                            return beforeNum + formatted + unitPartStr;
                        } catch (e) {
                           return beforeNum + '-' + numPartStr + unitPartStr;
                        }
                    }
                    return beforeNum + '-' + numPartStr + unitPartStr;
                }
            } else { 
                if (prev.startsWith('(-') && prev.endsWith(')')) { 
                    return prev.substring(2, prev.length - 1);
                } else if (prev.startsWith('-')) { 
                    return prev.substring(1);
                } else if (prev.length > 0) { 
                    const requiresParenthesis = /[+\-*/\s^(%&|<>]/.test(prev) || (prev.includes(" to ") && !prev.startsWith("(-"));
                    return requiresParenthesis ? `-(${prev})` : `-${prev}`;
                }
            }
            return prev; 
        });
        setIsResultInInput(false); 
    }
  }, [input, calculateResult, setError, angleMode, numberBase, calculatorType, isResultInInput, preprocessExpression, formatResultValue, error, previousInput]); 
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, shiftKey } = event;
      let R_handled = false;

      const activeEl = document.activeElement;
      const isInputFocused = activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement || (activeEl as HTMLElement)?.isContentEditable;

      const findButton = (k: string, type?: ButtonType) => 
        currentButtonLayout.find(b => b.value === k && (type ? b.type === type : true) && b.value !== ' '); // Ignore placeholder button
      
      const findButtonByDisplay = (disp: string, type?: ButtonType) =>
        currentButtonLayout.find(b => b.display === disp && (type ? b.type === type : true) && b.value !== ' '); // Ignore placeholder button

      if (key >= '0' && key <= '9') {
        const button = findButton(key, 'number');
        if (button && !isButtonDisabled(button, numberBase, calculatorType)) {
            handleButtonClick(key, button.type); R_handled = true;
        }
      } else if (calculatorType === 'PROGRAMMING' && numberBase === 'HEX' && key.length === 1 && key.match(/[a-f]/i)) {
        const button = findButton(key.toUpperCase(), 'hexDigit');
        if (button && !isButtonDisabled(button, numberBase, calculatorType)) {
            handleButtonClick(key.toUpperCase(), button.type); R_handled = true;
        }
      } else if (key === '.') {
        const dotButton = findButton('.');
        if (dotButton && !isButtonDisabled(dotButton, numberBase, calculatorType)){
            handleButtonClick(key, dotButton.type); R_handled = true;
        }
      } else if (key === '+') { const btn = findButton('+','operator'); if(btn && !isButtonDisabled(btn, numberBase, calculatorType)) {handleButtonClick('+', 'operator'); R_handled = true;}
      } else if (key === '-') { const btn = findButton('-','operator'); if(btn && !isButtonDisabled(btn, numberBase, calculatorType)) {handleButtonClick('-', 'operator'); R_handled = true;}
      } else if (key === '*') { const btn = findButton('*','operator'); if(btn && !isButtonDisabled(btn, numberBase, calculatorType)) {handleButtonClick('*', 'operator'); R_handled = true;}
      } else if (key === '/') { const btn = findButton('/','operator'); if(btn && !isButtonDisabled(btn, numberBase, calculatorType)) {handleButtonClick('/', 'operator'); R_handled = true;}
      } else if (key === '%') { 
          const btn = findButton('%','operator'); if(btn && !isButtonDisabled(btn, numberBase, calculatorType)) {handleButtonClick('%', 'operator'); R_handled = true;}
      } else if (key === '^') { 
          if (shiftKey && key === '6'){ // For Shift+6 = ^
             const pwrBtn = findButton('^','operator'); if(pwrBtn && !isButtonDisabled(pwrBtn, numberBase, calculatorType)) {handleButtonClick('^', 'operator'); R_handled = true;}
          } else if (!shiftKey && calculatorType === 'PROGRAMMING') { // For ^ as XOR in programming
             const xorBtn = findButtonByDisplay('XOR'); 
             if(xorBtn && !isButtonDisabled(xorBtn, numberBase, calculatorType)) {
                handleButtonClick(xorBtn.value, xorBtn.type); R_handled = true;
             } else { // Fallback to power if XOR not present or disabled
                const pwrBtn = findButton('^','operator'); if(pwrBtn && !isButtonDisabled(pwrBtn, numberBase, calculatorType)) {handleButtonClick('^', 'operator'); R_handled = true;}
             }
          } else if (!shiftKey) { // For ^ as power in other modes
             const pwrBtn = findButton('^','operator'); if(pwrBtn && !isButtonDisabled(pwrBtn, numberBase, calculatorType)) {handleButtonClick('^', 'operator'); R_handled = true;}
          }
      } else if (key === 'Enter' || key === '=') { calculateResult(); R_handled = true;
      } else if (key === 'Backspace') { handleButtonClick('', 'delete'); R_handled = true;
      } else if (key === 'Escape') { handleButtonClick('', 'clear'); R_handled = true;
      } else if (key === '(') { const btn = findButton('(','operator'); if(btn && !isButtonDisabled(btn, numberBase, calculatorType)) {handleButtonClick('(', 'operator'); R_handled = true;}
      } else if (key === ')') { const btn = findButton(')','operator'); if(btn && !isButtonDisabled(btn, numberBase, calculatorType)) {handleButtonClick(')', 'operator'); R_handled = true;}
      } else if (key.toLowerCase() === 'p' && (ctrlKey || metaKey)) {
        const piButton = findButton('pi', 'constant');
        if (piButton && !isButtonDisabled(piButton, numberBase, calculatorType)) {
            handleButtonClick('pi', 'constant'); R_handled = true;
        }
      } else if (key.toLowerCase() === 'e') {
        if (ctrlKey || metaKey) { 
            const eulerButton = findButton('e', 'constant'); // Euler's number 'e'
            if (eulerButton && !isButtonDisabled(eulerButton, numberBase, calculatorType) && !isInputFocused) {
                 handleButtonClick('e', 'constant'); R_handled = true;
            }
        } else if (!isInputFocused) { 
            const expButton = findButtonByDisplay('EXP');  // Scientific notation 'e'
            if (expButton && !isButtonDisabled(expButton, numberBase, calculatorType)) {
                handleButtonClick(expButton.value, expButton.type); R_handled = true;
            } else if (calculatorType === 'PROGRAMMING' && numberBase === 'HEX') { 
                 const hexEButton = findButton('E', 'hexDigit');
                 if (hexEButton && !isButtonDisabled(hexEButton, numberBase, calculatorType)) {
                    handleButtonClick('E', 'hexDigit'); R_handled = true;
                 }
            }
        }
      } else if (key === '&' && !shiftKey && calculatorType === 'PROGRAMMING') { 
        const andButton = findButtonByDisplay('AND');
        if (andButton && !isButtonDisabled(andButton, numberBase, calculatorType)) {handleButtonClick(andButton.value, andButton.type); R_handled = true;}
      } else if (key === '|' && !shiftKey && calculatorType === 'PROGRAMMING') { 
        const orButton = findButtonByDisplay('OR');
        if (orButton && !isButtonDisabled(orButton, numberBase, calculatorType)) {handleButtonClick(orButton.value, orButton.type); R_handled = true;}
      } else if (key === '~' && calculatorType === 'PROGRAMMING') { 
        const notButton = findButtonByDisplay('NOT');
        if (notButton && !isButtonDisabled(notButton, numberBase, calculatorType)) {handleButtonClick(notButton.value, notButton.type); R_handled = true;}
      } else if (shiftKey && key === 'L' && calculatorType === 'PROGRAMMING' && !isInputFocused) { 
        const lshButton = findButtonByDisplay('Lsh');
        if (lshButton && !isButtonDisabled(lshButton, numberBase, calculatorType)) {handleButtonClick(lshButton.value, lshButton.type); R_handled = true;}
      } else if (shiftKey && key === 'R' && calculatorType === 'PROGRAMMING' && !isInputFocused) { 
        const rshButton = findButtonByDisplay('Rsh');
        if (rshButton && !isButtonDisabled(rshButton, numberBase, calculatorType)) {handleButtonClick(rshButton.value, rshButton.type); R_handled = true;}
      } else if (key.toLowerCase() === 't' && (calculatorType === 'ECONOMICS' || calculatorType === 'PHYSICS') && !isInputFocused) {
        const toButton = findButtonByDisplay('to', 'operator');
        if(toButton && !isButtonDisabled(toButton, numberBase, calculatorType)) {
            handleButtonClick(toButton.value, toButton.type); R_handled = true;
        }
      }


      if (R_handled && !isInputFocused) {
        event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleButtonClick, calculateResult, numberBase, calculatorType, currentButtonLayout]); 


  const isButtonDisabled = (btn: ButtonConfig, currentBase: NumberBase, currentCalcType: CalculatorType): boolean => {
    const val = btn.value;
    if (val === ' ') return true; // Disable placeholder buttons

    if (currentCalcType === 'PROGRAMMING') {
        if (val === '.' || btn.display === 'EXP' || val === '%' || btn.type === 'unit' || btn.value === ' to ') { 
            if (currentBase !== 'DEC') return true;
        }
        if (btn.type === 'number' || btn.type === 'hexDigit') {
            if (val >= '2' && val <= '9') {
                if (currentBase === 'BIN') return true;
                if (currentBase === 'OCT' && val > '7') return true;
            }
            if (btn.type === 'hexDigit') { 
                return currentBase !== 'HEX';
            }
        }
        if (['sin(', 'cos(', 'tan(', 'log(', 'log10(', 'sqrt('].includes(val)) return true;
        if (['pi', PHYSICAL_CONSTANTS_DEFINITIONS.speedOfLight.value].includes(val) && btn.type === 'constant') { 
            if (currentBase !== 'DEC') return true;
        }
        if (val === 'e' && btn.type === 'constant' && currentBase !== 'DEC') return true; 
        if (val === '!' && btn.type === 'functionPostfix' && currentBase !== 'DEC') return true; 
        if (val === '+/-' && currentBase !== 'DEC') return true; 
    } else if (currentCalcType === 'ECONOMICS') {
        if (btn.type === 'hexDigit') return true;
        const programmerOpsDisplays = ['Lsh', 'Rsh', 'AND', 'OR', 'XOR', 'NOT'];
        if (programmerOpsDisplays.includes(btn.display)) return true;
        if (Object.values(PHYSICAL_CONSTANTS_DEFINITIONS).some(p => p.value === btn.value && btn.type === 'constant')) {
            return true; 
        }
    } else if (currentCalcType === 'PHYSICS') {
        if (btn.type === 'hexDigit') return true;
        const programmerOpsDisplays = ['Lsh', 'Rsh', 'AND', 'OR', 'XOR', 'NOT'];
        if (programmerOpsDisplays.includes(btn.display)) return true; 
    } else { // GENERIC
        if (btn.type === 'hexDigit') return true; 
        const programmerOpsDisplays = ['Lsh', 'Rsh', 'AND', 'OR', 'XOR', 'NOT'];
        if (programmerOpsDisplays.includes(btn.display)) return true; 
        if (btn.type === 'unit' && btn.value !== ' to ') return true; 
    }
    return false;
  };

  return (
    <div className={styles.calculator}>
      <div className={styles.calculatorTypeToggle}>
        {(['GENERIC', 'PHYSICS', 'PROGRAMMING', 'ECONOMICS'] as CalculatorType[]).map(type => (
          <button
            key={type}
            onClick={() => handleCalculatorTypeChange(type)}
            className={`${styles.modeButton} ${calculatorType === type ? styles.active : ''}`}
          >
            {type.charAt(0) + type.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className={styles.display}>
        <div className={styles.previousInput}>{error && previousInput.endsWith('=') ? previousInput : (error && !error.startsWith("Info:") ? '' : previousInput)}</div>
        <div className={error && !error.startsWith("Info:") ? styles.error : styles.currentInput}>
          {error || input || '0'}
        </div>
      </div>

      <div className={styles.modeToggles}>
        {(calculatorType === 'GENERIC' || calculatorType === 'PHYSICS' || calculatorType === 'ECONOMICS') && (
            <div className={styles.angleModeToggle}>
                <button 
                onClick={() => handleButtonClick('RAD', 'mode')}
                className={`${styles.modeButton} ${angleMode === 'RAD' ? styles.active : ''}`}
                title="Radians Mode"
                >
                Rad
                </button>
                <button 
                onClick={() => handleButtonClick('DEG', 'mode')}
                className={`${styles.modeButton} ${angleMode === 'DEG' ? styles.active : ''}`}
                title="Degrees Mode"
                >
                Deg
                </button>
            </div>
        )}
        {calculatorType === 'PROGRAMMING' && (
            <div className={styles.baseModeToggle}>
                {(['BIN', 'OCT', 'DEC', 'HEX'] as NumberBase[]).map(base => (
                <button
                    key={base}
                    onClick={() => handleButtonClick(base, 'baseMode')}
                    className={`${styles.modeButton} ${numberBase === base ? styles.active : ''}`}
                >
                    {base}
                </button>
                ))}
            </div>
        )}
      </div>

      <div className={`${styles.buttonsGrid} ${calculatorType === 'PHYSICS' ? styles.physicsGrid : ''} ${calculatorType === 'ECONOMICS' ? styles.economicsGrid : ''}`}>
        {currentButtonLayout.map((btn, index) => {
          let buttonClass = styles.button;
          if (btn.type === 'operator' || btn.type === 'functionPostfix') buttonClass += ` ${styles.operator}`;
          if (btn.type === 'functionPrefix' || btn.type === 'constant' || btn.type === 'unit') buttonClass += ` ${styles.function}`;
          if (btn.type === 'hexDigit') buttonClass += ` ${styles.function}`; 
          if (btn.type === 'equals') buttonClass += ` ${styles.equals}`;
          if (btn.type === 'clear' || btn.type === 'delete') buttonClass += ` ${styles.clear}`;
          
          const disabled = isButtonDisabled(btn, numberBase, calculatorType);

          return (
            <button
              key={`${calculatorType}-${btn.value}-${btn.display}-${index}`} 
              className={`${buttonClass} ${btn.className || ''} ${disabled ? styles.disabled : ''}`}
              onClick={() => handleButtonClick(btn.value, btn.type)}
              title={btn.title || btn.display}
              disabled={disabled}
              style={btn.style || {}}
            >
              {btn.display}
            </button>
          );
        })}
      </div>
    </div>
  );
}