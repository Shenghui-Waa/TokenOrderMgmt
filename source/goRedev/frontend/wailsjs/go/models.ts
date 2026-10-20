export namespace binding {
	
	export class AppInfo {
	    name: string;
	    version: string;
	    databasePath: string;
	
	    static createFrom(source: any = {}) {
	        return new AppInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.version = source["version"];
	        this.databasePath = source["databasePath"];
	    }
	}
	export class Invoice {
	    id: string;
	    invoiceNo: string;
	    totalAmountCent: number;
	    invoiceDate: string;
	    invoiceType: string;
	    invoiceTitleId: string;
	    invoiceTitleName: string;
	    status: string;
	    updatedAt?: string;
	
	    static createFrom(source: any = {}) {
	        return new Invoice(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.invoiceNo = source["invoiceNo"];
	        this.totalAmountCent = source["totalAmountCent"];
	        this.invoiceDate = source["invoiceDate"];
	        this.invoiceType = source["invoiceType"];
	        this.invoiceTitleId = source["invoiceTitleId"];
	        this.invoiceTitleName = source["invoiceTitleName"];
	        this.status = source["status"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class TokenOrder {
	    id: string;
	    orderNo: string;
	    amountCent: number;
	    paymentType: string;
	    providerId: string;
	    providerName?: string;
	    invoiceId?: string;
	    invoiceStatus: string;
	    invoiceType?: string;
	    deleted: number;
	    updatedAt?: string;
	
	    static createFrom(source: any = {}) {
	        return new TokenOrder(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.orderNo = source["orderNo"];
	        this.amountCent = source["amountCent"];
	        this.paymentType = source["paymentType"];
	        this.providerId = source["providerId"];
	        this.providerName = source["providerName"];
	        this.invoiceId = source["invoiceId"];
	        this.invoiceStatus = source["invoiceStatus"];
	        this.invoiceType = source["invoiceType"];
	        this.deleted = source["deleted"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class InvoiceTitle {
	    id: string;
	    name: string;
	    titleType: string;
	    taxCode?: string;
	
	    static createFrom(source: any = {}) {
	        return new InvoiceTitle(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.titleType = source["titleType"];
	        this.taxCode = source["taxCode"];
	    }
	}
	export class Provider {
	    id: string;
	    name: string;
	    website: string;
	
	    static createFrom(source: any = {}) {
	        return new Provider(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.website = source["website"];
	    }
	}
	export class DataSet {
	    providers: Provider[];
	    titles: InvoiceTitle[];
	    orders: TokenOrder[];
	    invoices: Invoice[];
	
	    static createFrom(source: any = {}) {
	        return new DataSet(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.providers = this.convertValues(source["providers"], Provider);
	        this.titles = this.convertValues(source["titles"], InvoiceTitle);
	        this.orders = this.convertValues(source["orders"], TokenOrder);
	        this.invoices = this.convertValues(source["invoices"], Invoice);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class InvoiceInput {
	    invoiceNo: string;
	    invoiceDate: string;
	    invoiceTitleId: string;
	
	    static createFrom(source: any = {}) {
	        return new InvoiceInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.invoiceNo = source["invoiceNo"];
	        this.invoiceDate = source["invoiceDate"];
	        this.invoiceTitleId = source["invoiceTitleId"];
	    }
	}
	
	export class InvoiceTitleInput {
	    id?: string;
	    name: string;
	    titleType: string;
	    taxCode: string;
	
	    static createFrom(source: any = {}) {
	        return new InvoiceTitleInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.titleType = source["titleType"];
	        this.taxCode = source["taxCode"];
	    }
	}
	
	export class ProviderInput {
	    id?: string;
	    name: string;
	    website: string;
	
	    static createFrom(source: any = {}) {
	        return new ProviderInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.website = source["website"];
	    }
	}
	
	export class TokenOrderInput {
	    id?: string;
	    orderNo: string;
	    amount: string;
	    paymentType: string;
	    providerId: string;
	
	    static createFrom(source: any = {}) {
	        return new TokenOrderInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.orderNo = source["orderNo"];
	        this.amount = source["amount"];
	        this.paymentType = source["paymentType"];
	        this.providerId = source["providerId"];
	    }
	}

}

