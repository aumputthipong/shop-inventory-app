package main

import "github.com/aumputthipong/shop-inventory-app/backend/internal/orders"

const (
	sampleOwnerName = "พลอย"
	sampleStaffName = "ณัฐ"
	sampleStockNote = "ของล็อตแรก"
)

type sampleProduct struct {
	sku, name, price string
	threshold, qty   int32
}

type sampleOrder struct {
	channel     orders.Channel
	externalRef string
	customer    string
	items       map[string]int32
	pack        bool
}

// SKU-0005 starts with one unit so two customers can race for it in a demo.
var sampleCatalog = []sampleProduct{
	{"SKU-0001", "เสื้อยืดคอกลม สีขาว M", "290.00", 5, 24},
	{"SKU-0002", "กางเกงยีนส์ขายาว 32", "600.00", 5, 8},
	{"SKU-0003", "หมวกแก๊ป สีดำ", "250.00", 3, 4},
	{"SKU-0004", "กระเป๋าผ้า canvas", "350.00", 10, 60},
	{"SKU-0005", "ไดร์เป่าผม รุ่นพกพา", "890.00", 2, 1},
}

// The last order is meant to be refused, so the audit log has a rejected attempt to show.
var sampleOrders = []sampleOrder{
	{orders.ChannelShopee, "SHP-2409-0101", "", map[string]int32{"SKU-0001": 1, "SKU-0002": 1}, false},
	{orders.ChannelLine, "", "คุณมะลิ", map[string]int32{"SKU-0001": 5, "SKU-0002": 4}, true},
	{orders.ChannelShopee, "SHP-2409-0102", "", map[string]int32{"SKU-0003": 2}, false},
	{orders.ChannelLine, "", "คุณต้นกล้า", map[string]int32{"SKU-0003": 2, "SKU-0004": 2}, false},
	{orders.ChannelShopee, "SHP-2409-0103", "", map[string]int32{"SKU-0003": 1}, false},
}
