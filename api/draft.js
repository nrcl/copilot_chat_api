// api/draft.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { device_id, history, adminDraft } = req.body;

    try {
        // --- ส่วนที่ 1: ตรวจสอบสิทธิ์จาก Google Sheet (ID ใน Column A) ---
        const SHEET_ID = '1UvmZTMn_0l7fC1J0QEg8slvoyonUGDtcMcitqT7t5r4'; // *** เปลี่ยนเป็น ID ของคุณ ***
        const sheetUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
        
        const sheetResponse = await fetch(sheetUrl);
        const csvData = await sheetResponse.text();
        
        const rows = csvData.split('\n');
        const allowedIds = rows.map(row => row.split(',')[0].replace(/"/g, '').trim());

        if (!allowedIds.includes(device_id)) {
            return res.status(403).json({ 
                error: 'Unauthorized', 
                message: `เครื่องยังไม่ได้รับอนุญาต (ID: ${device_id}) กรุณาแจ้ง Admin เพื่อลงทะเบียนชื่อเครื่องครับ` 
            });
        }

        // --- ส่วนที่ 2: System Instruction (เป๊ะตามที่คุณกำหนด) ---
    const systemInstruction = `คุณคือผู้ช่วยแอดมินร้าน EC MALL (ec-mall.com) ภารกิจคือ "เสริมสิ่งที่ขาด" เพื่อปิดการขาย โดยห้ามพูดซ้ำเรื่องที่แจ้งไปแล้วในแชท

    กฎหลักในการตอบ:
    1. **กรณีแนะนำสินค้า (สำคัญมาก)**: ถ้าลูกค้าถามหากล้องประเภทใดก็ตามแบบกว้างๆ หรือยังไม่ได้ระบุรุ่นที่แน่นอน ให้แจ้งว่าขอแจ้งรายละเอียด และราคาสินค้าก่อน ดังนี้
    2. **กรณีระบุรุ่นแล้ว**: ให้พยายามปิดการขาย ถ้ามีของเลย พยายามลด Friction เช่น มีของเลย พร้อมส่ง ส่งฟรี แถมเมม
    3. **กรณีตัดสินใจซื้อ**: ให้ส่งเลขบัญชีและช่องทางการชำระเงิน รวมถึงถามที่อยู่วิธีจัดส่ง หรือวันเวลานัดรับสินค้า
    4. **การป้ายยา (Up-sell/Cross-sell)**: ถ้าลูกค้าตัดสินใจซื้อแล้ว ให้นำเสนออุปกรณ์เสริม เช่น แบตเตอรี่เสริม หรืออัพเกรดเมมโมรี่เพิ่ม และต้องเสนอการ "ประกันเพิ่ม 3 ปี รวมอุบัติเหตุ (8%)" ซึ่งทำได้สำหรับกล้องดิจิตอลเท่านั้น
    5. **กรณีสินค้าหมด**: ต้องมี (1)คำขอโทษ (2)อธิบายสาเหตุสถานการณ์เพิ่มเติม และ (3)เสนอทางเลือกหรือสินค้าอื่นทดแทนอย่างกระตือรือร้น
    6. **การยึดลูกค้า**: ถ้าสินค้าหมด พยายามยึดลูกค้าไว้ เช่น การขอเบอร์ติดต่อเพื่อแจ้งเมื่อสินค้าเข้า หรือการให้มัดจำเพื่อล็อคคิวสินค้าแน่นอน

    *หมายเหตุและข้อควรระวังสำคัญ*:
    - สื่อสารเป็นภาษาเดียวกับที่ลูกค้าใช้ สุภาพ เป็นกันเอง
    - **ห้าม Recap**: ห้ามเกริ่นนำหรือสรุปเรื่องเดิมที่คุยไปแล้ว ให้เข้าเรื่องใหม่ทันที
    - **ห้ามเล่นละคร**: ร่างเฉพาะ "ข้อความที่แอดมินต้องตอบถัดไป" เพียงข้อความเดียวเท่านั้น ห้ามสมมติบทสนทนาโต้ตอบกันเอง
    - **EDITOR ROLE**: หากแอดมินพิมพ์ร่างข้อความไว้ ให้ยึดเจตนานั้นเป็นหลักและนำไปร้อยเรียงเข้ากับบริบทแชทให้เนียนที่สุด โดยไม่พูดซ้ำเรื่องเก่า`;

    // แยก Logic กรณีมีข้อความใน Textbox และไม่มี
    if (adminDraft && adminDraft.trim().length > 0) {
        userPrompt = `[ประวัติแชทล่าสุด]:\n${history}\n\n` +
                     `[สาระสำคัญที่แอดมินร่างไว้]: "${adminDraft}"\n\n` +
                     `คำสั่ง: นำสาระสำคัญที่แอดมินร่างไว้มาขยายความและเกลาให้สละสลวยตามกฎ 6 ข้อ ` +
                     `โดยต้องพิจารณาบริบทแชทเพื่อไม่ให้สื่อสารซ้ำซ้อน และตอบกลับเพียงข้อความเดียวเท่านั้น:`;
    } else {
        userPrompt = `[ประวัติแชทล่าสุด]:\n${history}\n\n` +
                     `คำสั่ง: วิเคราะห์สถานการณ์และร่างข้อความตอบกลับถัดไปเพียงข้อความเดียวตามกฎ 6 ข้อ ` +
                     `(หากแชทจบแล้วหรือยังไม่จำเป็นต้องตอบให้ส่งค่าว่าง):`;
    }

        const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` 
            },
            body: JSON.stringify({
                model: "gpt-4o",
                messages: [
                    { role: "system", content: systemInstruction },
                    { role: "user", content: userPrompt }
                ],
                temperature: 0.3
            })
        });

        const data = await aiResponse.json();
        const result = data.choices[0]?.message?.content || "";
        
        res.status(200).json({ suggestion: (result.includes("ค่าว่าง") || result.trim() === "") ? "" : result });

    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
