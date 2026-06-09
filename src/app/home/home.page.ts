// import { CommonModule } from '@angular/common';
// import { Component } from '@angular/core';
// import { FormsModule } from '@angular/forms';

// import {
//   IonContent,
//   IonInput,
//   IonButton,
//   IonLabel
// } from '@ionic/angular/standalone';

// @Component({
//   selector: 'app-home',
//   templateUrl: './home.page.html',
//   styleUrls: ['./home.page.scss'],
//   standalone: true,
//   imports: [
//     CommonModule,
//     FormsModule,
//     IonContent,
//     IonInput,
//     IonButton,
//     IonLabel
//   ]
// })
// export class HomePage {

//   expression: string = '';
//   currentInput: string = '';
  
//   currentStatus: string = '';
//   inputValid: boolean = false;
//   causes: string [] = [];

//   //inputValid: boolean = false;

// startAnalyzer() {
//     this.currentInput = this.expression;
//     this.causes = this.causes;
//     this.inputValid = this.isValidArithmeticExpression(this.expression);

//     this.currentStatus = this.inputValid
//       ? 'VALID EXPRESSION'
//       : `INVALID EXPRESSION. ${this.causes.join(' ')}`;

//     this.expression = '';
//   }

//   isValidArithmeticExpression(expression: string): boolean {

//     this.causes = [];

//     // Remove whitespace
//     expression = expression.replace(/\s+/g, '');

//     if (expression.length === 0) {
//       this.causes.push('No expression detected.');
//     }

//     // Must contain at least one operator
//     if (!/[+\-*/]/.test(expression)) {
//       this.causes.push('No operator detected.');
//     }

//     // Allow only digits, operators, and parentheses
//     if (!/^[0-9()+\-*/]+$/.test(expression)) {
//       this.causes.push('Non-numeral characters detected.');
//     }

//     // Check balanced parentheses
//     let balance = 0;

//     for (const char of expression) {

//       if (char === '(') {
//         balance++;
//       }

//       if (char === ')') {
//         balance--;

//         if (balance < 0) {
//           this.causes.push('Imbalanced parenthesis pair.');
//           break;
//         }
//       }
//     }

//     if (balance !== 0) {
//       this.causes.push('Imbalanced parenthesis pair.');
//     }

//     // Cannot start or end with an operator
//     if (/^[+\-*/]|[+\-*/]$/.test(expression)) {
//       this.causes.push('Expression starts or ends with an operator.');
//     }

//     // No consecutive operators
//     if (/[+\-*/]{2,}/.test(expression)) {
//       this.causes.push('Consecutive operators detected.');
//     }

//     // No operator immediately after '('
//     if (/\([+\-*/]/.test(expression)) {
//       this.causes.push('Operator after opening parenthesis detected.');
//     }

//     // No operator immediately before ')'
//     if (/[+\-*/]\)/.test(expression)) {
//       this.causes.push('Operator before closing parenthesis detected.');
//     }

//     // No empty parentheses
//     if (/\(\)/.test(expression)) {
//       this.causes.push('Empty parentheses detected.');
//     }

//     return this.causes.length === 0;
//   }

//   clearInput() {
//     this.currentInput = '';
//     this.currentStatus = '';
//   }
// }

import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  IonContent,
  IonInput,
  IonButton,
  IonLabel
} from '@ionic/angular/standalone';

// ==========================================
// --- LEXER/TOKENIZER ---
// ==========================================
enum TokenType { NUM, PLUS, MINUS, MULT, DIV, LPAREN, RPAREN, EOF }

class Token {
  constructor(public type: TokenType, public value: string) {}
}

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  input = input.replace(/\s+/g, ""); // Remove whitespaces

  while (i < input.length) {
    const c = input.charAt(i);
    if (/[0-9]/.test(c)) {
      let sb = "";
      while (i < input.length && /[0-9]/.test(input.charAt(i))) {
        sb += input.charAt(i);
        i++;
      }
      tokens.push(new Token(TokenType.NUM, sb));
      continue;
    }
    switch (c) {
      case '+': tokens.push(new Token(TokenType.PLUS, "+")); break;
      case '-': tokens.push(new Token(TokenType.MINUS, "-")); break;
      case '*': tokens.push(new Token(TokenType.MULT, "*")); break;
      case '/': tokens.push(new Token(TokenType.DIV, "/")); break;
      case '(': tokens.push(new Token(TokenType.LPAREN, "(")); break;
      case ')': tokens.push(new Token(TokenType.RPAREN, ")")); break;
      default: throw new Error(`Unexpected character: ${c}`);
    }
    i++;
  }
  tokens.push(new Token(TokenType.EOF, ""));
  return tokens;
}

// ==========================================
// --- PARSE TREE NODES ---
// ==========================================
abstract class Node {
  children: Node[] = [];
  constructor(public name: string) {}
}

class ExprNode extends Node { constructor() { super("EXPR"); } }
class TermNode extends Node { constructor() { super("TERM"); } }
class FactorNode extends Node { constructor() { super("FACTOR"); } }
class NumNode extends Node { constructor() { super("NUM"); } }
class DigitNode extends Node { constructor() { super("DIGIT"); } }
class TerminalNode extends Node {
  constructor(value: string) { super(value); }
}

// ==========================================
// --- PARSER ---
// ==========================================
class Parser {
  private ptr = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token { return this.tokens[this.ptr]; }
  private consume(): Token { return this.tokens[this.ptr++]; }

  public parseExpr(): Node {
    let current = this.parseTerm();
    while (this.peek().type === TokenType.PLUS || this.peek().type === TokenType.MINUS) {
      const op = this.consume();
      const right = this.parseTerm();
      
      // --- FIX: Force the left side to be an EXPR node to match EXPR -> EXPR + TERM ---
      if (!(current instanceof ExprNode)) {
        const leftWrapper = new ExprNode();
        leftWrapper.children.push(current);
        current = leftWrapper;
      }

      const parent = new ExprNode();
      parent.children.push(current);
      parent.children.push(new TerminalNode(op.value));
      parent.children.push(right);
      current = parent;
    }
    if (!(current instanceof ExprNode)) {
      const wrapper = new ExprNode();
      wrapper.children.push(current);
      return wrapper;
    }
    return current;
  }

  private parseTerm(): Node {
    let current = this.parseFactor();
    while (this.peek().type === TokenType.MULT || this.peek().type === TokenType.DIV) {
      const op = this.consume();
      const right = this.parseFactor();

      // --- FIX: Force the left side to be a TERM node to match TERM -> TERM * FACTOR ---
      if (!(current instanceof TermNode)) {
        const leftWrapper = new TermNode();
        leftWrapper.children.push(current);
        current = leftWrapper;
      }

      const parent = new TermNode();
      parent.children.push(current);
      parent.children.push(new TerminalNode(op.value));
      parent.children.push(right);
      current = parent;
    }
    if (!(current instanceof TermNode)) {
      const wrapper = new TermNode();
      wrapper.children.push(current);
      return wrapper;
    }
    return current;
  }

  private parseFactor(): Node {
    const factor = new FactorNode();
    if (this.peek().type === TokenType.LPAREN) {
      factor.children.push(new TerminalNode(this.consume().value)); // (
      factor.children.push(this.parseExpr());
      if (this.peek().type !== TokenType.RPAREN) throw new Error("Missing )");
      factor.children.push(new TerminalNode(this.consume().value)); // )
    } else if (this.peek().type === TokenType.NUM) {
      factor.children.push(this.parseNum(this.consume().value));
    } else {
      throw new Error(`Unexpected token: ${this.peek().value || 'EOF'}`);
    }
    return factor;
  }

  private parseNum(val: string): Node {
    return this.buildNumTree(val, val.length - 1);
  }

  private buildNumTree(val: string, index: number): Node {
    const digit = new DigitNode();
    digit.children.push(new TerminalNode(val.charAt(index)));

    if (index === 0) {
      const num = new NumNode();
      num.children.push(digit);
      return num;
    } else {
      const num = new NumNode();
      num.children.push(this.buildNumTree(val, index - 1));
      num.children.push(digit);
      return num;
    }
  }

  public getPointerToken(): Token {
    return this.peek();
  }
}

// ==========================================
// --- COMPONENT IMPLEMENTATION ---
// ==========================================
@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonInput,
    IonButton,
    IonLabel
  ]
})
export class HomePage {

  expression: string = '';
  currentInput: string = '';
  
  currentStatus: string = '';
  inputValid: boolean = false;
  causes: string[] = [];
  
  // New array property to bind derivation steps to your HTML template UI
  derivationSteps: string[] = [];

  startAnalyzer() {
    this.currentInput = this.expression;
    this.causes = [];
    this.derivationSteps = [];

    // Step 1: Run your existing Regex validation checklist
    const regexValid = this.isValidArithmeticExpression(this.currentInput);

    if (!regexValid) {
      this.inputValid = false;
      this.currentStatus = `REJECTED. ${this.causes.join(' ')}`;
      this.expression = '';
      return;
    }

    // Step 2: If basic layout is clean, pass it to the actual Context-Free Grammar Parser
    try {
      const tokens = tokenize(this.currentInput);
      const parser = new Parser(tokens);
      const parseTreeRoot = parser.parseExpr();

      if (parser.getPointerToken().type !== TokenType.EOF) {
        throw new Error("Dangling tokens found. Syntax Error.");
      }

      // Step 3: Expression accepted! Generate Leftmost Derivation
      this.inputValid = true;
      this.currentStatus = 'ACCEPTED';
      this.generateDerivation(parseTreeRoot);

    } catch (error: any) {
      this.inputValid = false;
      this.causes.push(error.message || 'Parsing failed.');
      this.currentStatus = `REJECTED. ${this.causes.join(' ')}`;
    }

    this.expression = '';
  }

  // Left-Most Derivation Generator mapped directly into component state
  private generateDerivation(root: Node) {
    const currentSententialForm: Node[] = [root];
    
    const captureForm = () => {
      const step = currentSententialForm.map(n => n.name).join(' ');
      this.derivationSteps.push(`→ ${step}`);
    };

    const isNonTerminal = (n: Node): boolean => {
      return ["EXPR", "TERM", "FACTOR", "NUM", "DIGIT"].includes(n.name);
    };

    const hasNonTerminals = (): boolean => currentSententialForm.some(isNonTerminal);

    captureForm();

    while (hasNonTerminals()) {
      let targetIndex = currentSententialForm.findIndex(isNonTerminal);

      if (targetIndex !== -1) {
        const nonTerminal = currentSententialForm.splice(targetIndex, 1)[0];
        currentSententialForm.splice(targetIndex, 0, ...nonTerminal.children);
        captureForm();
      }
    }
  }

  isValidArithmeticExpression(expression: string): boolean {
    this.causes = [];
    expression = expression.replace(/\s+/g, '');

    if (expression.length === 0) {
      this.causes.push('No expression detected.');
    }
    if (!/[+\-*/]/.test(expression)) {
      this.causes.push('No operator detected.');
    }
    if (!/^[0-9()+\-*/]+$/.test(expression)) {
      this.causes.push('Non-numeral characters detected.');
    }

    let balance = 0;
    for (const char of expression) {
      if (char === '(') balance++;
      if (char === ')') {
        balance--;
        if (balance < 0) {
          this.causes.push('Imbalanced parenthesis pair.');
          break;
        }
      }
    }
    if (balance !== 0 && !this.causes.includes('Imbalanced parenthesis pair.')) {
      this.causes.push('Imbalanced parenthesis pair.');
    }

    if (/^[+\-*/]|[+\-*/]$/.test(expression)) {
      this.causes.push('Expression starts or ends with an operator.');
    }
    if (/[+\-*/]{2,}/.test(expression)) {
      this.causes.push('Consecutive operators detected.');
    }
    if (/\([+\-*/]/.test(expression)) {
      this.causes.push('Operator after opening parenthesis detected.');
    }
    if (/[+\-*/]\)/.test(expression)) {
      this.causes.push('Operator before closing parenthesis detected.');
    }
    if (/\(\)/.test(expression)) {
      this.causes.push('Empty parentheses detected.');
    }

    return this.causes.length === 0;
  }

  clearInput() {
    this.currentInput = '';
    this.currentStatus = '';
    this.derivationSteps = [];
    this.causes = [];
  }
}