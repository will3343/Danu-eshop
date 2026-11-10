import { Children, cloneElement, Fragment, isValidElement } from "react";

const tigrigna = {
  "A little more thoughtful. A little less ordinary.": "ብዝያዳ እተሓሰበ። ካብ ንቡር ዝተፈልየ።",
  "Free shipping over $75": "ካብ $75 ንላዕሊ ብነጻ ምብጻሕ",
  Home: "መበገሲ",
  "Shop all": "ኩሉ ዕድጊ",
  "About us": "ብዛዕባና",
  Blog: "ብሎግ",
  "All vendors": "ኩሎም ሸየጥቲ",
  Contact: "ርኸቡና",
  "Main navigation": "ቀንዲ ምንቅስቓስ",
  "Search products": "ፍርያት ድለ",
  "Search...": "ድለ...",
  "Open account": "ሕሳብ ክፈት",
  "Sign in": "እቶ",
  "Shopping bag, 0 items": "ዓረብያ ዕድጊ፣ 0 ኣቕሑ",
  "Shopping bag": "ዓረብያ ዕድጊ",
  "Admin E-shop home": "መበገሲ ዳኑ ኢ-ሾፕ",
  "Danu E-shop home": "መበገሲ ዳኑ ኢ-ሾፕ",
  "Change language to Tigrigna": "ቋንቋ ናብ ትግርኛ ቀይር",
  "Change language to English": "ቋንቋ ናብ እንግሊዝኛ ቀይር",
  Admin: "ኣስተዳዳሪ",
  "THE DANU EDIT": "ምርጫ ዳኑ",
  "Good things,": "ጽቡቕ ነገራት፣",
  "well made.": "ብጽቡቕ ዝተሰርሑ።",
  "Everyday finds from independent makers and thoughtful brands.": "ካብ ናጻ ፈጠርቲን ብጥንቃቐ ካብ ዝተመርጹ ብራንድታትን ንመዓልታዊ ህይወት ዝኸውን ምርጫታት።",
  "considered finds": "ብጥንቃቐ ዝተመርጹ ኣቕሑ",
  All: "ኩሉ",
  "YOUR BAG": "ዓረብያኻ",
  "Good choices.": "ጽቡቕ ምርጫ።",
  "Your bag is taking a little breather.": "ዓረብያኻ ቁሩብ ዕረፍቲ ትገብር ኣላ።",
  "Explore the shop": "ድኳን ተመልከት",
  Remove: "ኣውጽእ",
  "Order summary": "ጽማቕ ትእዛዝ",
  Subtotal: "ድምር ኣቕሑ",
  Shipping: "ምብጻሕ",
  Free: "ብነጻ",
  Total: "ጠቕላላ",
  "Shipping address": "ኣድራሻ ምብጻሕ",
  "Street, city, postal code": "ጽርግያ፣ ከተማ፣ ኮድ ፖስታ",
  "Demo checkout": "ናይ ፈተነ ክፍሊት",
  "No payment will be taken": "ዝኾነ ክፍሊት ኣይክፍጸምን እዩ",
  "Placing order...": "ትእዛዝ ይለኣኽ ኣሎ...",
  "Place order": "ትእዛዝ ለኣኽ",
  "Secure demo checkout. Payment processing is not connected.": "ውሑስ ናይ ፈተነ ክፍሊት። ምስራሕ ክፍሊት ኣይተኣሳሰረን።",
  "YOUR DANU": "ዳኑኻ",
  "Hello,": "ሰላም፣",
  "there": "ኣብዚ",
  "Your details and all the good things on their way.": "ዝርዝር ሓበሬታኻን ኣብ መገዲ ዘለዉ ጽቡቕ ነገራትን።",
  "Sign out ↗": "ውጻእ ↗",
  "Your details": "ዝርዝር ሓበሬታኻ",
  Name: "ስም",
  Email: "ኢመይል",
  Phone: "ተሌፎን",
  Address: "ኣድራሻ",
  "Save details": "ዝርዝር ሓበሬታ ኣቐምጥ",
  "Your orders": "ትእዛዛትካ",
  total: "ጠቕላላ",
  "Your first order will look right at home here.": "ቀዳማይ ትእዛዝካ ኣብዚ ክርአ እዩ።",
  "DANU CONTROL ROOM": "መቆጻጸሪ ዳኑ",
  "Good morning,": "ከመይ ሓዲርካ፣",
  "admin.": "ኣስተዳዳሪ።",
  orders: "ትእዛዛት",
  Orders: "ትእዛዛት",
  products: "ፍርያት",
  Products: "ፍርያት",
  customers: "ዓማዊል",
  Customers: "ዓማዊል",
  Order: "ትእዛዝ",
  Customer: "ዓሚል",
  Date: "ዕለት",
  Status: "ኩነታት",
  Manage: "ኣመሓድር",
  pending: "ተጸባዪ",
  processing: "ይስራሕ ኣሎ",
  shipped: "ተላኢኹ",
  delivered: "በጺሑ",
  cancelled: "ተሰሪዙ",
  "No orders yet.": "ገና ትእዛዛት የለን።",
  "Product catalogue": "ዝርዝር ፍርያት",
  "＋ Add product": "＋ ፍርያት ወስኽ",
  "Edit product": "ፍርያት ኣስተኻኽል",
  "New product": "ሓድሽ ፍርያት",
  Category: "ምድብ",
  Price: "ዋጋ",
  Stock: "ብዝሒ ኣቕሑ",
  Vendor: "ሸያጢ",
  "Image URL": "ኣድራሻ ምስሊ",
  "Or upload image": "ወይ ምስሊ ስቐል",
  "JPG, PNG, WebP, or GIF · up to 5 MB. An uploaded file takes priority over the URL.": "JPG፣ PNG፣ WebP ወይ GIF · ክሳብ 5 MB። ዝተሰቕለ ፋይል ካብ URL ቀዳምነት ኣለዎ።",
  Description: "መግለጺ",
  "Saving product...": "ፍርያት ይቕመጥ ኣሎ...",
  "Save product": "ፍርያት ኣቐምጥ",
  Cancel: "ሰርዝ",
  Edit: "ኣስተኻኽል",
  Delete: "ደምስስ",
  "in stock": "ኣብ መኽዘን ኣሎ",
  "Nothing found just yet. Try another search, or check back soon.": "ክሳብ ሕጂ ዝተረኽበ የለን። ካልእ ፍለጋ ፈትን፣ ወይ ድሕሪ ግዜ ተመለስ።",
  "A DANU FAVORITE": "ፍሉይ ምርጫ ዳኑ",
  "Stoneware Table Vase": "ናይ ሸክላ ቬዝ ጠረጴዛ",
  "Everyday Linen Throw": "ናይ መዓልታዊ ህይወት ኣንሶላ ሊነን",
  "Slow Morning Candle": "ናይ ህድእ ዝበለ ንግሆ ሽምዓ",
  "Handwoven Market Tote": "ብኢድ ዝተኣልመ ናይ ዕዳጋ ዓረብያ",
  "Ribbed Ceramic Cup": "ሕንጻጽ ዘለዎ ናይ ሴራሚክ ኩባያ",
  "Quiet Hours Journal": "ናይ ህድእ ሰዓታት መዝገብ",
  "Woven Wall Basket": "ብኢድ ዝተኣልመ ናይ መንደቕ ቅርጫት",
  "Botanical Hand Wash": "ናይ ተኽሊ መሕጸቢ ኢድ",
  "Hand-thrown stoneware with a soft matte glaze.": "ብኢድ ዝተሰርሐ ሸክላ፣ ልስሉስ ማት ሽፋን ዘለዎ።",
  "Washed European linen, woven for a softer everyday.": "ዝተሓጽበ ኤውሮጳዊ ሊነን፣ ንምቹእ መዓልታዊ ኣጠቓቕማ ዝተኣልመ።",
  "A clean-burning soy candle with cedar and bergamot.": "ብንጹህ ዝነድድ ናይ ሶያ ሽምዓ፣ ምስ ሴዳርን በርጋሞትን።",
  "A sturdy, naturally dyed cotton carry-all.": "ጽኑዕ፣ ብተፈጥሮኣዊ ሕብሪ ዝተሓብአ ናይ ጡጥ መሸከሚ።",
  "A tactile little cup made for long coffee breaks.": "ንነዊሕ ዕረፍቲ ቡን ዝተዳለወ ምቹእ ንእሽቶ ኩባያ።",
  "Recycled paper pages for lists, thoughts, and plans.": "ካብ ዳግማይ ዝተጠቕመ ወረቐት ዝተሰርሑ ገጻት ንዝርዝር፣ ሓሳባትን መደባትን።",
  "A sculptural storage basket woven by hand.": "ብኢድ ዝተኣልመ ንምኽዛን ዝኸውን ጽቡቕ ቅርጺ ዘለዎ ቅርጫት።",
  "Gentle, refillable hand wash with a fresh herbal scent.": "ልስሉስ፣ እንደገና ዝምላእ መሕጸቢ ኢድ፣ ሓድሽ መኣዛ ሳዕሪ ዘለዎ።",
  "Sold out": "ተወዲኡ",
  "＋ Add to bag": "＋ ናብ ዓረብያ ወስኽ",
  "Danu edit": "ምርጫ ዳኑ",
  "We couldn’t load products.": "ፍርያት ክንጽዕን ኣይከኣልናን።",
  "Try again": "እንደገና ፈትን",
  "Hide details": "ዝርዝር ሓበሬታ ሕባእ",
  "View details": "ዝርዝር ሓበሬታ ርአ",
  "↓ Invoice": "↓ ኢንቮይስ",
  Tracking: "ክትትል",
  "Tracking will appear when your order ships.": "ትእዛዝካ ምስ ተላእከ ሓበሬታ ክትትል ክቐርብ እዩ።",
  "A MORE CONSIDERED EVERYDAY": "ንመዓልታዊ ህይወት ብጥንቃቐ ዝተመርጸ",
  "Find your new": "ሓድሽ ምርጫኻ",
  "favorite": "ፍቱው",
  "thing.": "ነገር ርኸብ።",
  "Good design. Honest materials. Makers with a story to tell. Find the things that make every day feel a little more like yours.": "ጽቡቕ ዲዛይን። ቅኑዕ ንዋት። ዛንታ ዘለዎም ፈጠርቲ። ንመዓልታዊ ህይወትካ ፍሉይ ዝገብሩ ነገራት ርኸብ።",
  "Shop the collection": "ነዚ ምርጫ ዕደግ",
  "Small batch, big heart": "ብንእሽቶ መጠን፣ ብዓቢ ፍቕሪ",
  Thoughtful: "ብጥንቃቐ",
  "by nature": "ብባህሪ",
  "THE SLOW LIVING EDIT — NO. 04": "ህድእ ዝበለ ናብራ — ቁ. 04",
  "INDEPENDENT FINDS · CONSIDERED LIVING": "ናጻ ምርጫታት · ብጥንቃቐ ምንባር",
  "✳ Considered materials": "✳ ብጥንቃቐ ዝተመርጸ ንዋት",
  "✳ Made by real people": "✳ ብሰባት ዝተሰርሐ",
  "✳ A little less ordinary": "✳ ካብ ንቡር ቁሩብ ዝተፈልየ",
  "✳ Good things, made to last": "✳ ንነዊሕ ግዜ ዝጸንሕ ጽቡቕ ነገራት",
  "A FEW GOOD THINGS": "ገለ ጽቡቕ ነገራት",
  "Good finds,": "ጽቡቕ ምርጫታት፣",
  "right now.": "ሕጂ።",
  "Shop everything ↗": "ኩሉ ዕደግ ↗",
  "A NOTE FROM DANU": "መልእኽቲ ካብ ዳኑ",
  "More meaning.": "ዝያዳ ትርጉም።",
  "Less noise.": "ውሑድ ዕግርግር።",
  "We believe the things you bring into your home should have a story worth knowing. That's why we make room for the independent, the intentional, and the beautifully made.": "ናብ ገዛኻ እተእትዎም ነገራት ክፍለጥ ዝግብኦ ዛንታ ክህልዎም ኣለዎ ኢልና ንኣምን። ስለዚ ንናጻ፣ ብዕላማ ዝተሰርሑን ብጽቡቕ ዝተዳለዉን ነገራት ቦታ ንህብ።",
  "A little about us": "ብዛዕባና ቁሩብ",
  "THE OCCASIONAL GOOD THING": "እንሓንሳብ ጽቡቕ ነገር",
  "A good note,": "ጽቡቕ መልእኽቲ፣",
  "now and then.": "ካብ ግዜ ናብ ግዜ።",
  "A good note, now and then.": "ካብ ግዜ ናብ ግዜ ጽቡቕ መልእኽቲ።",
  "New makers, small joys, and 10% off your first order.": "ሓደሽቲ ፈጠርቲ፣ ንኣሽቱ ሓጎሳት፣ ከምኡውን ኣብ ቀዳማይ ትእዛዝካ 10% ቅናሽ።",
  "Your email address": "ኣድራሻ ኢመይልካ",
  "Count me in ↗": "ኣካትተኒ ↗",
  "A LITTLE ABOUT DANU": "ብዛዕባ ዳኑ ቁሩብ",
  "A softer kind of shopping.": "ዝያዳ ምቹእ ኣገባብ ዕድጊ።",
  "The Danu journal.": "መዝገብ ዳኑ።",
  "People behind the good things.": "ድሕሪ ጽቡቕ ነገራት ዘለዉ ሰባት።",
  "We’re all ears.": "ንሰምዓካ ድሉዋት ኢና።",
  "Danu is a home for thoughtful objects, independent makers, and the everyday things that make life feel a little more considered. We believe good design should be kind to the people who make it and the places we live.": "ዳኑ ንብጥንቃቐ ዝተመርጹ ኣቕሑ፣ ናጻ ፈጠርቲ፣ ከምኡውን ንህይወት ዝያዳ ዝተሓሰበት ዝገብሩ መዓልታዊ ነገራት ዝእክብ ቦታ እዩ። ጽቡቕ ዲዛይን ንዝሰርሕዎ ሰባትን ንእንነብረሉ ቦታታትን ክሕልው ኣለዎ ኢልና ንኣምን።",
  "Notes from our makers, little rituals for slower days, and ideas for making a home your own. Our journal is just getting started — join our list and be the first to read along.": "ካብ ፈጠርትና ዝመጹ ሓሳባት፣ ንህድእ ዝበሉ መዓልታት ንኣሽቱ ልምድታት፣ ከምኡውን ገዛኻ ናትካ ንምግባር ሓሳባት። መዝገብና ገና ይጅምር ኣሎ — ኣብ ዝርዝርና ተጸንበር እሞ ቀዳማይ ኣንባቢ ኩን።",
  "Every Danu find comes from a maker or small brand that cares about doing things well. We’re growing our collective of independent makers — check back for stories from the people behind the products.": "ነፍሲ ወከፍ ምርጫ ዳኑ ካብ ስርሑ ብጽቡቕ ካብ ዝፍጽም ፈጣሪ ወይ ንእሽቶ ብራንድ ይመጽእ። ማሕበር ናጻ ፈጠርቲ ነስፍሕ ኣለና — ብዛዕባ ድሕሪ ፍርያት ዘለዉ ሰባት ዝተነግሩ ዛንታታት ንምርኣይ እንደገና ተመለስ።",
  "Questions about an order, a product, or just want to say hello? Drop us a note at hello@danu.shop. We’re a small team and we’ll get back to you within two working days.": "ብዛዕባ ትእዛዝ ወይ ፍርያት ሕቶ ኣለካ፣ ወይ ሰላም ክትብል ትደሊ? ናብ hello@danu.shop መልእኽቲ ስደደልና። ንእሽቶ ጉጅለ ኢና፣ ኣብ ውሽጢ ክልተ ናይ ስራሕ መዓልታት ክንምልሰልካ ኢና።",
  "Stay in touch ↗": "ርክብና ቀጽል ↗",
  "Good things are better": "ጽቡቕ ነገራት ዝሓሸ እዮም",
  "shared.": "ምስ ካልኦት ክካፈሉ።",
  "Join the list ↗": "ኣብ ዝርዝር ተጸንበር ↗",
  "Thoughtful things for the everyday.": "ብጥንቃቐ ዝተመርጹ ንመዓልታዊ ህይወት።",
  "Made by people who care.": "ብዝሓልዩ ሰባት ዝተሰርሑ።",
  Explore: "ተመልከት",
  "Need a hand?": "ሓገዝ የድልየካ?",
  "Contact us": "ርኸቡና",
  "Track an order": "ትእዛዝ ተኸታተል",
  "New makers, small joys, and a little 10% off.": "ሓደሽቲ ፈጠርቲ፣ ንኣሽቱ ሓጎሳት፣ ከምኡውን 10% ቅናሽ።",
  "Independent finds. Considered living.": "ናጻ ምርጫታት። ብጥንቃቐ ምንባር።",
  "Admin access": "ናይ ኣስተዳዳሪ መእተዊ",
  "STAFF ACCESS": "መእተዊ ሰራሕተኛታት",
  "WELCOME TO DANU": "ናብ ዳኑ እንቋዕ ብደሓን መጻእካ",
  "A familiar face.": "ዝፈለጥናዮ ሰብ።",
  "Let's get acquainted.": "ንሓድሕድና ንፋለጥ።",
  Close: "ዕጸው",
  Subscribe: "ተመዝገብ",
  "Warm, thoughtfully designed living space": "ብጥንቃቐ ዝተዳለወ ምቹእ መንበሪ ቦታ",
  "Curated independent shop": "ብጥንቃቐ ዝተመርጹ ናጻ ፍርያት ዘለዉዎ ድኳን",
  "Thoughtfully arranged home objects": "ብጥንቃቐ ዝተዳለዉ ናይ ገዛ ኣቕሑ",
  "Full name": "ምሉእ ስም",
  Password: "መሕለፊ ቃል",
  "One moment...": "ቁሩብ ተጸበ...",
  "Create account": "ሕሳብ ፍጠር",
  "New around here?": "ሓድሽ ኣብዚ?",
  "Already have an account?": "ድሮ ሕሳብ ኣለካ?",
  "Create an account": "ሕሳብ ፍጠር",
  "Admin accounts are configured by the store owner.": "ሕሳብ ኣስተዳዳሪ ብበዓል ድኳን ይዳሎ።",
  "Product saved and added to the storefront": "ፍርያት ተቐሚጡ ናብ ድኳን ተወሲኹ",
  "Product deleted": "ፍርያት ተደምሲሱ",
  "Profile updated": "ሓበሬታ መግለጺ ተሓዲሱ",
  "You have been signed out": "ወጺእካ ኣለኻ",
  "Sign in to complete your order": "ትእዛዝካ ንምፍጻም እቶ",
  "Customer sign-in is required to place an order": "ትእዛዝ ንምልኣኽ ናይ ዓሚል መእተዊ የድሊ",
  "You're on the list — look out for a note from us.": "ኣብ ዝርዝር ተጸንቢርካ — ካባና መልእኽቲ ተጸበ።",
  "Delete this product?": "ነዚ ፍርያት ደሊኻ ክትድምስሶ?",
  "Unable to download invoice": "ኢንቮይስ ምውራድ ኣይተኻእለን",
  "Decrease quantity": "ብዝሒ ኣጉድል",
  "Increase quantity": "ብዝሒ ወስኽ",
};

export function getInitialLanguage() {
  return localStorage.getItem("danu-language") === "ti" ? "ti" : "en";
}

export function translateCategory(value, language) {
  if (language !== "ti") return value;
  const categories = {
    HOME: "ገዛ",
    TEXTILES: "ጨርቃ ጨርቂ",
    LIVING: "ናይ ገዛ ናብራ",
    ACCESSORIES: "መሳርሒታት",
    STATIONERY: "ናይ ጽሕፈት ኣቕሑ",
    BODY: "ናይ ኣካላት ክንክን",
  };
  return categories[value.toUpperCase()] || value;
}

export function translateText(value, language) {
  if (language !== "ti" || typeof value !== "string") return value;
  const trimmed = value.trim();
  let translated = tigrigna[trimmed];
  if (!translated) {
    const consideredFinds = trimmed.match(/^(\d+) considered finds$/);
    const totalOrders = trimmed.match(/^(\d+) total$/);
    const orderNotice = trimmed.match(/^Order #(\d+) placed — demo checkout only; no payment was taken\.$/);
    const orderUpdated = trimmed.match(/^Order #(\d+) updated$/);
    const welcome = trimmed.match(/^Welcome,? ?(.*)!$/);
    const bagCount = trimmed.match(/^Shopping bag, (\d+) items$/);
    const updateStatus = trimmed.match(/^Update order (\d+) status$/);
    const stockText = trimmed.match(/^(.+) · (\d+) in stock$/);
    if (consideredFinds) translated = `${consideredFinds[1]} ብጥንቃቐ ዝተመርጹ ኣቕሑ`;
    else if (totalOrders) translated = `${totalOrders[1]} ጠቕላላ`;
    else if (orderNotice) translated = `ትእዛዝ #${orderNotice[1]} ተላኢኹ — ናይ ፈተነ ክፍሊት ጥራይ፤ ክፍሊት ኣይተፈጸመን።`;
    else if (orderUpdated) translated = `ትእዛዝ #${orderUpdated[1]} ተሓዲሱ`;
    else if (welcome) translated = `እንቋዕ ብደሓን መጻእካ${welcome[1] ? `፣ ${welcome[1]}` : ""}!`;
    else if (bagCount) translated = `ዓረብያ ዕድጊ፣ ${bagCount[1]} ኣቕሑ`;
    else if (updateStatus) translated = `ኩነታት ትእዛዝ ${updateStatus[1]} ኣስተኻኽል`;
    else if (stockText) translated = `${stockText[1]} · ${stockText[2]} ኣብ መኽዘን ኣሎ`;
  }
  if (!translated) return value;
  const leading = value.match(/^\s*/)?.[0] || "";
  const trailing = value.match(/\s*$/)?.[0] || "";
  return `${leading}${translated}${trailing}`;
}

export function localizeTree(node, language) {
  if (language !== "ti" || node == null || typeof node === "boolean") return node;
  if (typeof node === "string") return translateText(node, language);
  if (Array.isArray(node)) return Children.map(node, (child) => localizeTree(child, language));
  if (!isValidElement(node)) return node;
  if (typeof node.type !== "string" && node.type !== Fragment) return node;

  const props = {};
  for (const key of ["aria-label", "placeholder", "title", "alt"]) {
    if (typeof node.props[key] === "string") props[key] = translateText(node.props[key], language);
  }
  props.children = localizeTree(node.props.children, language);
  return cloneElement(node, props);
}
