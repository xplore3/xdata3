//PdfHelper.ts
import fs from 'fs';
import path from 'path';
import { PDFDocument } from 'pdfkit';

export class PdfHelper {
  private baseDir: string;
  private fontPath: string;

  constructor(baseDir:string = __dirname) {
    this.baseDir = path.resolve(baseDir);
    this.fontPath = path.join(this.baseDir, 'fonts', 'NotoSerifCJKsc-Regular.otf');

    if (!fs.existsSync(this.fontPath)) {
      throw new Error(`Cant find font file ${this.fontPath}`);
    }
  }

  /**
   * txt file（input.txt）to PDF file
   * @param {string} txtFileName
   * @returns {Promise<string>} PDF file
   */
  async generateFromTxtFileName(txtFileName: string) {
    const txtPath = path.join(this.baseDir, txtFileName);

    if (!fs.existsSync(txtPath)) {
      throw new Error(`TXT file unexist: ${txtPath}`);
    }

    const content = fs.readFileSync(txtPath, 'utf8');
    const pdfFileName = txtFileName.replace(/\.txt$/i, '.pdf');
    const pdfPath = path.join(this.baseDir, pdfFileName);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);

    doc.font(this.fontPath).fontSize(12).text(content, {
      align: 'left'
    });

    doc.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', () => resolve(pdfPath));
      writeStream.on('error', reject);
    });
  }
}
