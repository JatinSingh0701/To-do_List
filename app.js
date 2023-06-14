const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const _ = require("lodash");
const date = require(path.join(__dirname, "/date.js"));
const mongoose = require("mongoose");

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

mongoose.connect("mongodb://127.0.0.1/todolistDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const itemsSchema = new mongoose.Schema({
  name: String,
});

const Item = mongoose.model("Item", itemsSchema);

const defaultItems = [
  {
    name: "Welcome to your todolist!",
  },
  {
    name: "Hit the + button to add a new item.",
  },
  {
    name: "<-- Hit this to delete an item.",  
  },
];

const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema],
});

const List = mongoose.model("List", listSchema);

// Home Route
app.get("/", async function (req, res) {
  try {
    const foundItems = await Item.find({});

    if (foundItems.length === 0) {
      await Item.insertMany(defaultItems);
      console.log("Successfully saved default items to DB");
      res.redirect("/");
    } else {
      const day = date.getDate();
      res.render("list", { listTitle: day, newListItems: foundItems });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

// Custom List Route
app.get("/:customListName", function (req, res) {
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({ name: customListName })
    .then((foundList) => {
      if (!foundList) {
        const list = new List({
          name: customListName,
          items: defaultItems,
        });

        list.save();
        res.redirect("/" + customListName);
      } else {
        res.render("list", {
          listTitle: foundList.name,
          newListItems: foundList.items,
        });
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Internal Server Error");
    });
});

// Create New Item
app.post("/", function (req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName,
  });
  if (listName === date.getDate()) {
    item.save();
    res.redirect("/");
  } else {
    List.findOne({ name: listName }).then((foundList) => {
      foundList.items.push(item);
      foundList.save();
      res.redirect("/" + listName);
    });
  }
});

// Delete Item
app.post("/delete", async (req, res) => {
  try {
    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;

    if (listName === date.getDate()) {
      await Item.findByIdAndDelete(checkedItemId);
      console.log("Successfully deleted checked item.");
      res.redirect("/");
    } else {
      const foundList = await List.findOne({ name: listName });
      foundList.items.pull({ _id: checkedItemId });
      await foundList.save();
      res.redirect("/" + listName);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Internal Server Error");
  }
});


// About Route
app.get("/about", function (req, res) {
  res.render("about");
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
