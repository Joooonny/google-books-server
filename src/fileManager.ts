import fs from "fs";
import moment from "moment";
import { v4 } from "uuid";
import { Book } from "./models/Book";
import { Reader } from "./models/Reader";
import { Writer } from "./models/Writer";
import { User } from "./interfaces/User";
import { Order } from "./interfaces/Order";
import { Review } from "./interfaces/Review";
import { Coupon } from "./interfaces/Coupon";

const booksURI = `${process.cwd()}/files/books.json`;
const writersURI = `${process.cwd()}/files/writers.json`;
const readersURI = `${process.cwd()}/files/readers.json`;

/**
 * Read books json and translate to Book[]
 * @param uri
 */

export const readBooks = (): Book[] => {
	const anyArray = JSON.parse(fs.readFileSync(booksURI).toString());
	let bookArray: Book[] = [];
	anyArray.map(({ _title, _price, _launchDate, _genre, _description, _author, _editors, _img, _soldCopies, _reviews, _id}: any) => {
		bookArray.push(
			new Book(_title, _price, _launchDate, _genre, _description, _author, _editors, _img ,_soldCopies, _reviews, _id)
		);
	});
	return bookArray;
};

export const readWriters = (): Writer[] => {
	const anyArray = JSON.parse(fs.readFileSync(writersURI).toString());
	let writerArray: Writer[] = [];
	anyArray.map(
		({ _email, _password, _nationality, _booksIds, _fund, _id, _token }: User) => {
			writerArray.push(
				new Writer(_email, _password, _nationality, _fund, _booksIds, _id, _token)
			);
		}
	);
	return writerArray;
};

export const readReaders = (): Reader[] => {
	const anyArray = JSON.parse(fs.readFileSync(readersURI).toString());
	let readerArray: Reader[] = [];
	anyArray.map(
		({
			_email,
			_id,
			_password,
			_fund,
			_token,
			_booksIds,
			_nationality,
			_orders = [],
			_coupons = [],
		}: User) => {
			readerArray.push(
				new Reader(
					_email,
					_password,
					_nationality,
					_fund,
					_booksIds,
					_orders,
					_coupons,
					_id,
					_token
				)
			);
		}
	);
	return readerArray;
};

export const getBookById = (iId: string): Book | undefined =>
	readBooks().find(({ id }: Book) => id === iId);

export const getWriterById = (iId: string): Writer | undefined =>
	readWriters().find(({ id }: Writer) => id === iId);

export const getReaderById = (iId: string): Reader | undefined =>
	readReaders().find(({ id }: Reader) => id === iId);


export const getIdFromEmail = (iEmail: string, role: 'READER' | 'WRITER') =>
({
	WRITER: readWriters().find(
		({ email }: Writer) => email === iEmail
	)?.id,
	READER: readReaders().find(
		({ email }: Reader) => email === iEmail
	)?.id,
}[role]);

export const areSomeBookUndefined = (inventory: string[]) => inventory.map(bId => getBookById(bId)).some(b => b === undefined);

export const isTooExpensive = (rId: string, inventory: string[], couponId?: string) =>
	 inventory.map(bId => getBookById(bId)!.price).reduce((acc: number, curr: number) => acc + curr) > getReaderById(rId)!.fund + (getCouponById(rId, couponId || '')?.money || 0)

export const haveAlready = (rId: string, inventory: string[]) => inventory.some(bId => getReaderById(rId)!.booksIds.includes(bId));

export const getCouponById = (rId: string, couponId: string) => {
	const coupon = getReaderById(rId)!.coupons.find(coup => coup.id === couponId);
	// let readers = readReaders();
	// const reader = readers.find(r => r.id === rId)!
	// if (!coupon) return undefined;
	// if (moment().diff(moment(coupon.deadline, 'DD/MM/YYYY')) > 0) {
	// 	reader.deleteCoupon(couponId);
	// 	fs.writeFileSync(readersURI, JSON.stringify(readers, null, 2));
	// 	return undefined;
	// }
	// return coupon;
	return coupon;
}

export const makeOrder = (rId: string, inventory: string[], couponId?: string) => {
	let books = readBooks();
	let readers = readReaders();
	let writers = readWriters();
	let total: number = 0;
	const reader = readers.find((r: Reader) => r.id === rId)!;
	const coupon = getCouponById(rId, couponId ?? '');
	books = books.map(b => {
		if (inventory.includes(b.id)) b.soldCopies++;
		return b;
	})

	writers.map(writer => {
		inventory.map(bId => {
			if (getBookById(bId)!.author === writer.id) {
				const book = getBookById(bId)!
				writer.fund += book.price;
				total += book.price;
			}
		})
	})

	coupon != undefined
		? reader.useCoupon(coupon.id, total)
		: reader.fund -= total;

	reader.addBooksIds(inventory);

	const order: Order = {
		id: v4(),
		date: moment().calendar(),
		inventory,
		total
	}
	reader.addOrder(order);
	fs.writeFileSync(booksURI, JSON.stringify(books, null, 2));
	fs.writeFileSync(readersURI, JSON.stringify(readers, null, 2));
	fs.writeFileSync(writersURI, JSON.stringify(writers, null, 2));
};

export const isBookExists = (bookId: string): boolean => {
	const books = readBooks();
	return books.some(({ id }) => id === bookId)
}

export const isEmailExists = (iEmail: string, role: "READER" | "WRITER") =>
({
	WRITER: readWriters().some(({ email }: Writer) => email === iEmail),
	READER: readReaders().some(({ email }: Reader) => email === iEmail),
}[role]);

export const isPasswordCorrect = (
	iPassword: string,
	role: "READER" | "WRITER"
) =>
({
	WRITER: readWriters().some(
		({ password }: Writer) => password === iPassword
	),
	READER: readReaders().some(
		({ password }: Reader) => password === iPassword
	),
}[role]);

export const writeUser = (email: string, password: string, nationality: string, role: "READER" | "WRITER") => {
	let array: Writer[] | Reader[] = [];
	let uri: string = '';
	({
		WRITER: () => { array = readWriters(); array.push(new Writer(email, password, nationality)); uri = writersURI; },
		READER: () => { array = readReaders(); array.push(new Reader(email, password, nationality)); uri = readersURI; },
	})[role]();

	fs.writeFileSync(uri, JSON.stringify(array, null, 2))
}

export const writeToken = (iEmail: string, role: "READER" | "WRITER"): string => {
	let array: Writer[] | Reader[] = [];
	let uri: string = '';
	const token = v4();
	({
		WRITER: () => { array = readWriters(); array.find(({ email }: Writer) => email === iEmail)!.token = token; uri = writersURI; },
		READER: () => { array = readReaders(); array.find(({ email }: Reader) => email === iEmail)!.token = token; uri = readersURI; },
	})[role]();

	fs.writeFileSync(uri, JSON.stringify(array, null, 2))
	return token;
}

export const refil = (money: number, rId: string) => {
	const readers = readReaders();
	readers.find(r => r.id === rId)!.fund += money;
	fs.writeFileSync(readersURI, JSON.stringify(readers, null, 2))
}

export const deleteToken = (iToken: string) => {
	const writers = readWriters();
	const readers = readReaders();
	const writer = writers.find(({ token }: Writer) => token === iToken);
	const reader = readers.find(({ token }: Reader) => token === iToken);
	if (writer) {
		writer.token = undefined;
		fs.writeFileSync(writersURI, JSON.stringify(writers, null, 2));
	} if (reader) {
		reader.token = undefined;
		fs.writeFileSync(readersURI, JSON.stringify(readers, null, 2));
	}
	return writer != undefined || reader != undefined;
}

export const writeBook = (title: string, price: number, genre: string, description: string, author: string, editors: string[], img: string) => {
	const books = readBooks();
	const writers = readWriters();
	const book = new Book(title, price, moment().calendar(), genre, description, author, editors, img);
	books.push(book);
	writers.find(w => w.id === author)!.addBooksIds(book.id);
	fs.writeFileSync(booksURI, JSON.stringify(books, null, 2));
	fs.writeFileSync(writersURI, JSON.stringify(writers, null, 2));
}

export const deleteBook = (iId: string): void => {
	let books = readBooks();
	books = books.filter(({ id }: Book) => id !== iId);
	fs.writeFileSync(booksURI, JSON.stringify(books, null, 2));
}

export const editBook = (bId: string, title: string, price: number, description: string): void => {
	let books = readBooks();
	books.map((b: Book) => {
		if (b.id === bId) {
			b.title = title
			b.price = price
			b.description = description
		}
	})
	fs.writeFileSync(booksURI, JSON.stringify(books, null, 2));
}

export const getBooks = (id: string, role: "READER" | "WRITER") =>
	({
		WRITER: getWriterById(id)!.booksIds,
		READER: getReaderById(id)!.booksIds
	}[role]).map(bId => getBookById(bId)!);

export const writeReview = (bId: string, rId: string, title: string, text: string, valutation: 1 | 2 | 3 | 4 | 5): void => {
	const wReview: Review = { id: v4(), rId, title, date: moment().calendar(), text, valutation }
	let books: Book[] = readBooks();
	books.map((b: Book) => {
		if (b.id === bId) b.addReview(wReview)
	})
	fs.writeFileSync(booksURI, JSON.stringify(books, null, 2))
}

export const editReview = (bId: string, rId: string, title: string, text: string, valutation: 1 | 2 | 3 | 4 | 5) => {
	let books = readBooks();
	books.map((b: Book) => {
		if (b.id === bId) {
			const review = b.reviews.find((r: Review) => r.id === rId)!;
			review.title = title,
				review.text = text,
				review.valutation = valutation
		}
	})
	fs.writeFileSync(booksURI, JSON.stringify(books, null, 2))
}

export const isReviewExistByReader = (bId: string, rId: string): boolean =>
	getBookById(bId)!.reviews.some((r: Review) => r.rId === rId);

export const deleteReview = (bId: string, rId: string) => {
	let books = readBooks();
	books.map((b: Book) => {
		if (b.id === bId) {
			const review = b.reviews.find((r: Review) => r.id === rId)!;
			b.reviews.splice(b.reviews.indexOf(review), 1);
			b.deleteReview(review.id);
		}
	})
	fs.writeFileSync(booksURI, JSON.stringify(books, null, 2))
}

export const getReaderByEmail = (iEmail: string) =>
	readReaders().find(({ email }) => email === iEmail);


export const writeCoupon = (rId: string, money: number, iEmail?: string) => {
	let readers = readReaders();
	const coupon: Coupon = {
		id: v4(),
		money,
		deadline: moment().add(3, 'day').format('L')
	}
	const reader = readers.find(r => r.id === rId)!
	reader.fund -= money;
	iEmail ? readers.find(({ email }) => email === iEmail)!.addCoupon(coupon) : reader.addCoupon(coupon);
	fs.writeFileSync(readersURI, JSON.stringify(readers, null, 2));
}

export const isReviewExist = (rId: string, bId: string): boolean =>
	getBookById(bId)!.reviews.some((r: Review) => r.id === rId);

export const getEarnings = (wId: string) => {
	let earnings: object[] = [];
	getWriterById(wId)!.booksIds.map((bId: string) => getBookById(bId)!).map(({ id: bookId, soldCopies, price }) => {
		earnings.push({
			bookId,
			soldCopies,
			total: soldCopies * price
		})
	});
	return earnings;
}

export const getWriterNameById = (wId: string) : string | undefined => 
	getWriterById(wId) ? getWriterById(wId)!.email.split('@')[0] : undefined

export const getCoupons = (rId: string) => {
	const {coupons, fund} = getReaderById(rId)!;
	return {
		coupons,
		fund
	} 
}


