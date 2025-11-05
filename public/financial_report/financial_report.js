let table;

$(document).ready(function () {
  table = $("#inventoryTableTotal").DataTable({
    columnDefs: [
      {
        targets: [0],
        visible: false,
      },
    ],
    searching: false,
    lengthChange: false,
    dom: "Bfrtip",
    buttons: [
      {
        extend: "excel",
        text: "Export to Excel",
        title: "Inventory_Report",
        filename: "Inventory_Report_" + new Date().toISOString().slice(0, 10), // e.g., Inventory_Report_2025-06-30
        exportOptions: {
          columns: ":visible",
          footer: true, // include footer
        },
      },
      {
        extend: "pdf",
        text: "Export to PDF",
        title: "Inventory Report",
        filename: "Inventory_Report_" + new Date().toISOString().slice(0, 10),
        orientation: "landscape",
        pageSize: "A4",
        exportOptions: {
          columns: ":visible",
          footer: true, // include footer
        },
      },
    ],

    responsive: true,
    ajax: {
      url: "/getInventoryTotal",
      dataSrc: "data",
    },
    columns: [
      { data: "id" },
      { data: "item" },
      { data: "category" },
      { data: "quantity" },
      { data: "price" },
      {
        data: "total",
        render: function (data, type, row) {
          if (type === "display" || type === "filter") {
            return (
              "₱" +
              parseFloat(data)
                .toFixed(2)
                .replace(/\d(?=(\d{3})+\.)/g, "$&,")
            );
          }
          return data;
        },
      },
    ],
    footerCallback: function (row, data, start, end, display) {
      let api = this.api();

      // Function to parse value
      let parseValue = function (i) {
        return typeof i === "string"
          ? parseFloat(i.replace(/[\₱,]/g, ""))
          : typeof i === "number"
          ? i
          : 0;
      };

      // Function to format number with commas and peso sign
      let formatPeso = function (num) {
        return "₱" + num.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,");
      };

      // Total over all pages
      let total = api
        .column(5, { search: "applied" })
        .data()
        .reduce(function (a, b) {
          return parseValue(a) + parseValue(b);
        }, 0);

      // Update footer
      $(api.column(5).footer()).html(formatPeso(total));
    },
  });
});
