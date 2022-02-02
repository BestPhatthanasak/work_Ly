const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const inquirer = require('inquirer');
const { delay } = require('./delay');
const { typeText, clicked, radio, selectDropdown, fileChooser } = require('./helper');
const Captcha = require('2captcha');
const fs = require('fs');
const detailsUsers = require('./detailsUsers');
const solver = new Captcha.Solver('cf1a57cf69187a04ab9878c42f07a7b9'); // *_?

const url = 'https://recruit-lottery-seller.glo.or.th/recruit/index.php/pages/registerbnrseller';

const port = 5005;

let userStatus;

// let count = 0;
let count2 = 1;
class BrowserHandler {
	constructor() {
		const launch_browser = async () => {
			this.browser = false;
			this.browser = await puppeteer.launch({
				headless: false,
				waitUntil: 'load',
				timeout: 300000,
				ignoreHTTPSErrors: true,
				args: [ '--enable-blink-features=HTMLImports' ]
			});
			this.browser.on('disconnected', launch_browser);
		};

		(async () => {
			await launch_browser();
		})();
	}
}

const wait_for_browser = (browser_handler) =>
	new Promise((resolve, reject) => {
		const browser_check = setInterval(() => {
			if (browser_handler.browser !== false) {
				clearInterval(browser_check);
				resolve(true);
			}
		}, 100);
	});

const registerNewUser = async (page, prop) => {
	let res = {};
	await delay(2000);
	await page.goto(`${url}`);
	await delay(1000);
	await typeText(page, '#idno', prop.idNo);
	await delay(500);
	await typeText(page, '#mobile', prop.mobile); // โดยขึ้นต้นด้วย 0 ตามด้วย 6/8/9 และตามด้วยตัวเลข 8 หลัก
	await delay(1000);

	let random_word = await page.evaluate(() => {
		return document.querySelector('#random_word').value;
	});

	await delay(1000);
	await typeText(page, '#captcha_security', random_word);
	await delay(500);
	await clicked(page, '#myform1 > div:nth-child(6) > div > input:nth-child(3)');
	await delay(2000);

	// check error idNo and mobile
	try {
		let checkErrorIdNo = await page.evaluate(() => {
			const element = document.querySelector('#iderror > div');
			return (element && element.textContent) || undefined;
		});

		let checkErrorMobile = await page.evaluate(() => {
			const element = document.querySelector('#myform1 > div.form-group.mb-2 > div > div.text-danger > div');
			return (element && element.textContent) || undefined;
		});

		prop.errorIdNo = checkErrorIdNo;
		prop.errorMobile = checkErrorMobile;

		userStatus = await readWriteFile('Failed', prop);
		await delay(2000);
		res = { status: 'Failed', data: userStatus };
	} catch (error) {
		console.log(error);
	}
	return res;
};

const address = async (page, prop) => {
	//  จังหวัด | เขต/อำเภอ | แขวง/ตำบล
	await delay(2000);
	for (const key in prop) {
		if (Object.hasOwnProperty.call(prop, key)) {
			const element = prop[key];
			await delay(1000);
			await selectDropdown(page, key, element);
		}
	}
};

const enterOTPCode = async (page, prop) => {
	// #captchaerror > div
	const pageClicked = await page.evaluate(() => {
		return !!document.querySelector('#captchaerror > div'); // !! converts anything to boolean
	});
	if (pageClicked) {
		// console.log('True');
		await registerNewUser(page, prop);
	} else {
		// console.log('False');
	}

	await delay(3000);
	await page.waitForSelector('#ref_code');
	let refCode = await page.evaluate(() => {
		const element = document.querySelector('#ref_code');
		return (element && element.value) || '-'; // will return undefined if the element is not found
	});
	console.log('รหัสอ้างอิง : ', refCode);
	let questions = [
		{
			type: 'input',
			name: 'number',
			message: `รหัส OTP ที่ได้รับทาง SMS?`
		}
	];
	return await inquirer
		.prompt(questions)
		.then(async (answers) => {
			const otpCode = answers['number'];
			await delay(1000);
			await page.waitForSelector('#mobileotp');
			await delay(1000);
			await typeText(page, '#mobileotp', otpCode);
			await clicked(page, '#myform1 > div.form-group.row.rowbtn.mb-1 > div.col-sm-5 > input');
			await delay(2000);

			let checkNumberMoblie1 = await page.evaluate(() => {
				const element = document.querySelector('#myform1 > div.form-group.mb-4 > div > div');
				return (element && element.textContent).split(' ').join('').length || '-'; // will return undefined if the element is not found
			});
			let checkNumberMoblie2 = await page.evaluate(() => {
				const element = document.querySelector('#errortext');
				return (element && element.textContent).split(' ').join('').length || '-'; // will return undefined if the element is not found
			});
			let re = checkNumberMoblie1 || checkNumberMoblie2;
			if (checkNumberMoblie1 !== '-' || checkNumberMoblie2 !== '-') {
				while (re === '-' || count2 <= 2) {
					await enterOTPCode(page);
					count2++;
				}
			} else {
				await clicked(page, '#myform1 > div.form-group.row.rowbtn.mb-1 > div.col-sm-5 > input');
			}
		})
		.catch((error) => {
			if (error.isTtyError) {
				console.log("Prompt couldn't be rendered in the current environment");
			} else {
				console.log('');
			}
			return;
		});
};

const personVerifyotp = async (page) => {
	await page.waitForSelector('#chk1');
	await page.click('#chk1', { clickCount: 1 });
	await clicked(page, '#okbtn');
};

const detailsUser = async (page, prop) => {
	let resData;
	try {
		await radio(page, '#\\31'); // บุคคลทั่วไป #\\31 || คนพิการ #\\32
		await selectDropdown(page, 'prename', 'นาย'); // #prename    นาย || #prename  นาง || #prename  นางสาว
		await typeText(page, '#firstname', prop.firstname);
		await typeText(page, '#lastname', prop.lastname);
		await typeText(page, '#birthdate', prop.birthdate); // 01/01/2545
		// เลขประจำตัวประชาชน
		// await typeText(page, '#idno', prop.idNo);
		//ที่อยู่ตามทะเบียนบ้าน
		await typeText(page, '#addr', prop.addr); // บ้านเลขที่/หมู่ที่/ซอย
		await typeText(page, '#road', prop.road); // ถนน
		await address(page, { prov: prop.prov, ampdrop: prop.ampdrop, tambdrop: prop.tambdrop }); //select // จังหวัด | เขต/อำเภอ | แขวง/ตำบล

		// สถานที่รับสลาก
		await delay(3000);
		await selectDropdown(page, 'postdrop', prop.postdrop);

		// ที่อยู่ที่จัดส่งเอกสาร/จดหมาย
		await typeText(page, '#docaddr', prop.docaddr); // ที่อยู่ที่จัดส่งเอกสาร/จดหมาย
		await typeText(page, '#docroad', prop.docroad); // ถนน
		await address(page, { docampdrop: prop.docampdrop, doctambdrop: prop.doctambdrop }); //select // จังหวัด | เขต/อำเภอ | แขวง/ตำบล
		// สถานที่ขายสลากหรือบริเวณที่เร่ขาย
		await typeText(page, '#saleaddr', prop.saleaddr); // บ้านเลขที่/หมู่ที่/ซอย *
		await typeText(page, '#saleroad', prop.saleroad); // ถนน *
		await address(page, { saleampdrop: prop.saleampdrop, saletambdrop: prop.saletambdrop });

		// สถานที่ใกล้เคียง(1) *
		await typeText(page, '#nearaddr', prop.nearaddr);
		// สถานที่ใกล้เคียง(2) *
		await typeText(page, '#nearaddr2', prop.nearaddr2);

		// รูปภาพหน้าตรง
		await typeText(page, '#starttime', prop.starttime); // เวลาเปิด *
		await typeText(page, '#endtime', prop.endtime); // เวลาปิด  *

		// use in fileChooser
		await page.addScriptTag({
			url: 'https://code.jquery.com/jquery-3.2.1.min.js'
		});
		await delay(2000);
		// อัพโหลดไฟล์รูปภาพหน้าตรงของตนเอง
		await fileChooser(page, '#myform1 > div:nth-child(11) > input', `./images/${prop.image1}`);
		// อัพโหลดไฟล์รูปภาพสถานที่ขายสลากหรือรูปภาพขณะกำลังเดินเร่ขายสลาก
		await fileChooser(page, '#myform1 > div:nth-child(12) > input', `./images/${prop.image2}`);

		// กรุณาระบุผู้รับประโยชน์ กรณีที่ท่านมีการสั่งซื้อ-สั่งจองสลากก่อนถึงแก่กรรมภายใน
		await selectDropdown(page, 'prename2', prop.prename2);
		await typeText(page, '#firstname2', prop.firstname2);
		await typeText(page, '#lastname2', prop.lastname2);
		await typeText(page, '#idno2', prop.idno2);
		await typeText(page, '#mobile2', prop.mobile2);
		// ยอมรับตามข้อตกลงและเงื่อนไข
		await radio(page, '#acceptcondition');

		// บันทึกข้อมูล
		// await clicked(page, '#myform1 > div.form-group.row.rowbtn.mb-4 > div.col-sm-3 > input');

		// save ref User
		userStatus = await readWriteFile('Success', prop);
		await delay(2000);
		return { status: 'Success', data: userStatus };
	} catch (error) {
		userStatus = await readWriteFile('Failed', prop);
		return { status: 'Failed', data: userStatus };
	}
};

const readWriteFile = (stauts, prop) => {
	const { firstname, lastname, idNo, idno2, mobile, mobile2, image1, image2, errorIdNo, errorMobile } = prop;
	let dataUser;
	let dataUserArr;
	if (errorIdNo || errorMobile) {
		if (errorIdNo && errorMobile) {
			dataUser = `\nสถานะ : ${stauts} (ไม่สามารถลงทะเบียนได้เนื้องจาก ${errorIdNo} และ เบอร์มือถือนี้ได้ลงทะเบียนไว้แล้ว),\nชื่อ : ${firstname} ${lastname}\nรหัสบัตรประชาชน : ${idNo}\nเบอร์โทร : ${mobile}\nรูปภาพหน้าตรงของตนเอง : ${image1}\nรูปภาพสถานที่ขาย : ${image2}\nกรณีที่ท่านมีการสั่งซื้อ-สั่งจองสลากก่อนถึงแก่กรรมภายใน\nรหัสบัตรประชาชน : ${idno2}\nเบอร์โทร : ${mobile2}\n`;
			dataUserArr = {
				สถานะ: `${stauts} (ไม่สามารถลงทะเบียนได้เนื้องจาก ${errorIdNo} และ เบอร์มือถือนี้ได้ลงทะเบียนไว้แล้ว)`,
				ชื่อ: `${firstname} ${lastname}`,
				รหัสบัตรประชาชน: `${idNo}`,
				เบอร์โทร: `${mobile}`,
				รูปภาพหน้าตรงของตนเอง: `${image1}`,
				รูปภาพสถานที่ขาย: `${image2}`,
				กรณีที่ท่านมีการสั่งซื้อสั่งจองสลากก่อนถึงแก่กรรมภายในรหัสบัตรประชาชน: `${idno2}`,
				เบอร์โทร: `${mobile2}`
			};
		} else {
			dataUser = `สถานะ : ${stauts} (ไม่สามารถลงทะเบียนได้เนื้องจาก ${errorIdNo ||
				errorMobile})\nชื่อ : ${firstname} ${lastname}\nรหัสบัตรประชาชน : ${idNo}\nเบอร์โทร : ${mobile}\nรูปภาพหน้าตรงของตนเอง : ${image1}\nรูปภาพสถานที่ขาย : ${image2}\nกรณีที่ท่านมีการสั่งซื้อ-สั่งจองสลากก่อนถึงแก่กรรมภายใน\nรหัสบัตรประชาชน : ${idno2}\nเบอร์โทร : ${mobile2}\n`;
			dataUserArr = {
				สถานะ: `${stauts} (ไม่สามารถลงทะเบียนได้เนื้องจาก ${errorIdNo || errorMobile})`,
				ชื่อ: `${firstname} ${lastname}`,
				รหัสบัตรประชาชน: `${idNo}`,
				เบอร์โทร: `${mobile}`,
				รูปภาพหน้าตรงของตนเอง: `${image1}`,
				รูปภาพสถานที่ขาย: `${image2}`,
				กรณีที่ท่านมีการสั่งซื้อสั่งจองสลากก่อนถึงแก่กรรมภายในรหัสบัตรประชาชน: `${idno2}`,
				เบอร์โทร: `${mobile2}`
			};
		}
	} else {
		dataUser = `สถานะ : ${stauts}\nชื่อ : ${firstname} ${lastname}\nรหัสบัตรประชาชน : ${idNo}\nเบอร์โทร : ${mobile}\nรูปภาพหน้าตรงของตนเอง : ${image1}\nรูปภาพสถานที่ขาย : ${image2}\nกรณีที่ท่านมีการสั่งซื้อ-สั่งจองสลากก่อนถึงแก่กรรมภายใน\nรหัสบัตรประชาชน : ${idno2}\nเบอร์โทร : ${mobile2}\n`;
		dataUserArr = {
			สถานะ: `${stauts}`,
			ชื่อ: `${firstname} ${lastname}`,
			รหัสบัตรประชาชน: `${idNo}`,
			เบอร์โทร: `${mobile}`,
			รูปภาพหน้าตรงของตนเอง: `${image1}`,
			รูปภาพสถานที่ขาย: `${image2}`,
			กรณีที่ท่านมีการสั่งซื้อสั่งจองสลากก่อนถึงแก่กรรมภายในรหัสบัตรประชาชน: `${idno2}`,
			เบอร์โทร: `${mobile2}`
		};
	}
	fs.readFile('report.txt', (err, data) => {
		if (err) {
			fs.writeFile('report.txt', '', (err) => {
				if (err) throw err;
			});
		} else {
			const text = data.toString();
			if (text === '') {
				data = text.concat(dataUser);
			} else {
				data = text.concat(`\n${dataUser}`);
			}
			fs.writeFile('report.txt', data, (err) => {
				if (err) throw err;
			});
		}
	});
	return dataUserArr;
};

const registerLottery = async () => {
	const browser_handler = new BrowserHandler();
	await wait_for_browser(browser_handler);
	let page = await browser_handler.browser.newPage();
	let resData;
	console.log('\nstart\n');
	for (let index = 0; index < detailsUsers.length; index++) {
		const e = detailsUsers[index];
		// console.log('registerNewUser');
		resData = await registerNewUser(page, e);
		if (resData.status !== 'Failed') {
			// console.log('enterOTPCode');
			await enterOTPCode(page, e);
			// console.log('personVerifyotp');
			await personVerifyotp(page);
			// console.log('detailsUser');
			resData = await detailsUser(page, e);
		}
	}
	await delay(1000);
	return resData;
};

app.get('/', async (req, res) => {
	const reportUser = await registerLottery(res);
	console.log('reportUser', reportUser);
	await res.send(reportUser);
	console.log('End');
	// process.exit();
});

app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`);
});
