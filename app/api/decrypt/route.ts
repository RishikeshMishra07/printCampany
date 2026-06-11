import { NextResponse } from 'next/server';
import { writeFile, readFile, unlink, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

export async function POST(req: Request) {
  let inPath = '';
  let outPath = '';

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const password = formData.get('password') as string;
    
    if (!file || !password) {
      return NextResponse.json({ error: "File and password are required" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), 'uploads');
    await mkdir(uploadDir, { recursive: true });
    
    const id = uuidv4();
    inPath = path.join(uploadDir, `enc_${id}.xlsx`);
    outPath = path.join(uploadDir, `dec_${id}.xlsx`);
    
    await writeFile(inPath, buffer);

    // Run python tool to decrypt
    // msoffcrypto-tool -p <password> input.xlsx output.xlsx
    // We quote the paths and password to prevent shell injection
    try {
      await execAsync(`msoffcrypto-tool -p "${password.replace(/"/g, '\\"')}" "${inPath}" "${outPath}"`);
    } catch (execError: any) {
      console.error("Decryption failed:", execError);
      return NextResponse.json({ error: "Failed to decrypt. Incorrect password or unsupported file." }, { status: 401 });
    }

    // Read the decrypted file
    const decryptedBuffer = await readFile(outPath);

    // Return the raw buffer with appropriate headers
    return new NextResponse(decryptedBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="decrypted.xlsx"'
      }
    });

  } catch (error: any) {
    console.error("Decrypt API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    // Cleanup files
    if (inPath) await unlink(inPath).catch(() => {});
    if (outPath) await unlink(outPath).catch(() => {});
  }
}
