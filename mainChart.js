//Változók deklarálása:
var chartWidth = 1000, chartHeight = 500, barPadding = 5;
var data;
var machines = [];
var uniquejobs = [1];

//Kihasználtság
var utilization = 0; //Rendszer kihasználtsága, összesen mennyit ment, a kapacitáshoz képest
var utilizationsum = 0; //Rendszer összterheltsége
var utilizationmachine = []; //Gépenkénti kihasználtság (mennyit ment a gép)
var maxtopermachine = [];

//Terhelés
var operationsum = 0; //Összes operáció
var operationsummachine = []; //Gépenkénti operation szám

//Határidő
var showDueChecked = 0;
var jobintime = []; //mennyi munka van határidőn belül
var tardinessjob = []; //munkánkénti csúszások mértéke

//Tartalékidő
var sparetime = 0;
var sparetimeoperation = [];
var sparetimecritical = [];

//Setup idők összege, maximuma, darabszáma
var setupsum = 0;
var maxsetup = 0;
var setupcount = 0;

//Várakozás
var waitarray = [];

//Csúszás
var tardinesscount = 0;
var tardinesssum = 0;
var tardinessmax = 0;
var tardinessavg = 0;

//Koraiság
var earlinesscount = 0;
var earlinesssum = 0;
var earlinessavg = 0;

//Legkésőbbi operáció végének időpontja
var max;

//Jobok átfutási ideje
//Gyártási átfutási idő - jobonként
let jobleadtime = [];
//Termelési átfutási idő - jobonként
let jobltwithsetup = [];

//Inicializáltság vizsgálat
var isarraysinitialized = false;
isopsuminitialized = false;
var isutilizationinitialized = false;

//xAxis tick numbers
var tickdata = [];

//Gantt diagram kirajzolása
function drawDiagram(diadata) {
  data = diadata.Operations;
  machines = diadata.Resources;
  var startdate = new Date(diadata.StartDateTime);
  console.log(startdate);
  console.log(d3.max(data, d => d.EndTimeInInt));
  for (let i = 0; i < d3.max(data, d => d.EndTimeInInt); i++) {
    tickdata.push("" + i + "");
  }

  checkUniqueJob(uniquejobs);
  var colors = d3.scaleLinear()
    .domain([0, uniquejobs.length])
    .range(["#1f78b4", "#b2df8a", "#33a02c", "#fb9a99", "#e31a1c", "#fdbf6f", "#ff7f00", "#cab2d6", "#6a3d9a", "#ffff99", "#b15928",
      "#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462", "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd", "#ccebc5", "#ffed6f"])

  var barHeight = 18
  var margin = ({ top: 30, right: 20, bottom: 10, left: 60 })

  var height = Math.ceil((data.length + 0.1) * barHeight) + margin.top + margin.bottom
  var width = d3.max(data, d => d.EndTimeInInt) + 1200

  var svg = d3.select("svg")
    .attr("width", d3.max(data, d => d.EndTimeInInt) + 1200)
    .attr("height", chartHeight + "px")
    .style("display", "block")

  var x = d3.scaleLinear()
    //.domain([0, d3.max(data, d => d.EndTimeInInt)])
    .domain([tickdata[0], tickdata[tickdata.length - 1]])
    .range([margin.left, width - margin.right])

  var y = d3.scaleBand()
    .domain(d3.range(machines.length))
    .rangeRound([margin.top, height - margin.bottom])
    .padding(0.3)

  var format = x.tickFormat(5, data.format)

  xAxis = g => g
    .attr("transform", `translate(0,${margin.top + 50})`)
    //.call(d3.axisTop(x).ticks(d3.max(data, d => d.EndTimeInInt/20), data.format))
    .call(d3.axisTop(x).ticks(tickdata.length, data.format))

    //.call(g => g.selectAll('.tick line').remove())
    .selectAll('.tick text')
    .call(function (t) {
      t.each(function (d) {
        var self = d3.select(this);
        var s = parseInt(self.text());
        if (s % 6 != 0) {
          self.select('.tick line').remove();
          self.attr("display", "none");
        }
      })
    })
  // .call(g => g.select(".domain").remove())

  yAxis = g => g
    .attr("transform", `translate(${margin.left},50)`)
    .call(d3.axisLeft(y).tickFormat(i => machines[i].Name).tickSizeOuter(0))

  //Date per 24 hour
  svg.append("svg:g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")

    .call(xAxis)
    .selectAll('.x .tick text')
    .call(function (t) {
      t.each(function (d) {
        var self = d3.select(this);
        var s = parseInt(self.text());
        if (s % 24 == 0) {
          self.text(null);
          self.append("tspan")
            .attr("x", 0)
            .attr("dy", "-1.6em")
            .text(startdate.getFullYear() + ". " + startdate.getMonth() + ". " + startdate.getDate() + ".");
          startdate = addDays(startdate, 1);
        }
      })
    })

  //Grey rect, when machine is not working
  svg.append("defs")
    .append("pattern")
    .attr("width", d3.max(data, d => x(d.EndTimeInInt)))
    .attr("height", y.bandwidth())
    .attr("x", 0)
    .attr("y", 0)
    .attr("id", "bg")
    .append("image")
    .attr("width", d3.max(data, d => x(d.EndTimeInInt)))
    .attr("height", y.bandwidth())
    .attr("x", 0)
    .attr("y", 0)
    .attr("xlink:href", "zebra.png")


  var backrect = svg.append("g")
    .attr("fill", "grey")
    .attr("opacity", 0.7)
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", (d) => x(0))
    .attr("y", (d) => y(getMachineIndex(d) - 1) + 50)
    .attr("width", d3.max(data, d => x(d.EndTimeInInt)))
    .attr("height", y.bandwidth())
    .on("click", function (e) {
      for (let index = 0; index < data.length; index++) {
        var currentrect = document.getElementById(data[index].OperationIndex + "rectID" + data[index].JobId);
        currentrect.style.opacity = 1.0;
      }
    })

  //Different colored rects, when machine is working
  var rects = svg.append("g")
    .attr("fill", "red")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", (d) => x(d.StartTimeInInt))
    .attr("y", (d) => y(getMachineIndex(d) - 1) + 50)
    .attr("width", d => x(d.EndTimeInInt) - x(d.StartTimeInInt))
    .attr("height", y.bandwidth())
    .attr("id", (d) => d.OperationIndex + "rectID" + d.JobId)
    .attr("fill", function (d) { return d3.rgb(colors(d.JobId)) })
    .on("mouseover", function (e) {
      var tooltipdiv = document.getElementById("tooltip");
      if (document.getElementById("myCheck").checked == false) {
        tooltipdiv.style.opacity = 0.9;
        tooltipdiv.innerHTML = "Job " + e.JobId + "Operation index " + e.OperationIndex +
          "<br>Setup time:" + e.SetupTimeInInt + "<br> Duration: "
          + (e.EndTimeInInt - e.StartTimeInInt) + "<br> Due date: " + e.DueDateTime.getDate + "<br> Prority:" + e.Priority;
        tooltipdiv.style.left = x(e.StartTimeInInt) + 10 + "px";
        tooltipdiv.style.top = y(getMachineIndex(e) - 1) + 225 + "px";
        tooltipdiv.style.display = "block";
      }
      else {
        tooltipdiv.style.opacity = 0;
      }
    }).on("mouseout", function (e) {
      var tooltipdiv = document.getElementById("tooltip");
      tooltipdiv.style.display = "none";
    })
    .on("click", function (e) {
      for (let index = 0; index < data.length; index++) {

        var currentrect = document.getElementById(data[index].OperationIndex + "rectID" + data[index].JobId);

        if (data[index].JobId != e.JobId) {
          currentrect.style.opacity = 0.4;
        }
        else {
          currentrect.style.opacity = 1.0;
        }
      }
    })

  //Append innerrect, green or red, the job is in time or not
  const max = d3.max(data, function (d) {
    return d.EndTimeInInt;
  });
  var innerrects = svg.append("g")
    .attr("fill", "black")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", (d) => x(d.StartTimeInInt) + 5)
    .attr("y", (d) => y(getMachineIndex(d) - 1) + 55)
    .attr("width", d => x(d.EndTimeInInt) - x(d.StartTimeInInt) - 12)
    .attr("height", y.bandwidth() - 12)
    .attr("id", (d) => d.OperationId + "innerrect")
    .attr("fill", function (d) {
      for (let i = 0; i < uniquejobs.length; i++) {
        var ops = [];
        var maxPerJob = 0;
        for (let j = 0; j < data.length; j++) {
          if (d.JobId == uniquejobs[i]) {
            ops.push(d.DueDateTimeInInt);
          }
        }
        maxPerJob = d3.max(ops, function (d) {
          return d.EndTimeInInt;
        })
        if (maxPerJob < ops[0]) {
          return "green";
        }
        else {
          return "red";
        }
      }
    })
    .attr("opacity", 0.01)
    .attr("display", d => (((d.EndTimeInInt - d.StartTimeInInt) / max) < 0.01) ? "none" : "block")
    .on("mouseover", function (e) {
      var tooltipdiv = document.getElementById("tooltip");
      if (document.getElementById("myCheck").checked == false) {
        tooltipdiv.style.opacity = 0.9;
        tooltipdiv.innerHTML = "Job " + e.JobId + "Operation index " + e.OperationIndex +
          "<br>Setup time:" + e.SetupTimeInInt + "<br> Duration: "
          + (e.EndTimeInInt - e.StartTimeInInt) + "<br> Due date: " + e.DueDateTime.getDate + "<br> Prority:" + e.Priority;
        tooltipdiv.style.left = x(e.StartTimeInInt) + 10 + "px";
        tooltipdiv.style.top = y(getMachineIndex(e) - 1) + 225 + "px";
        tooltipdiv.style.display = "block";
      }
      else {
        tooltipdiv.style.opacity = 0;
      }
    }).on("mouseout", function (e) {
      var tooltipdiv = document.getElementById("tooltip");
      tooltipdiv.style.display = "none";
    });


  //Append setuprects
  var setuprect = svg.append("g")
    .attr("fill", "#424647")
    .selectAll("rect")
    .data(data)
    .join("rect")
    .attr("x", (d) => x(d.StartTimeInInt - d.SetupTimeInInt))
    .attr("y", (d) => y(getMachineIndex(d) - 1) + 50)
    .attr("width", d => x(d.StartTimeInInt) - x(d.StartTimeInInt - d.SetupTimeInInt))
    .attr("height", y.bandwidth())
    .attr("id", (d) => d.OperationIndex + "setup")


  //Information text on the operation
  svg.append("g")
    .attr("fill", "black")
    .attr("text-anchor", "end")
    .attr("font-family", "sans-serif")
    .attr("font-size", 12)
    .selectAll("text")
    .data(data)
    .join("text")
    .attr("x", d => (x(d.EndTimeInInt) - 5))
    .attr("y", (d) => y(getMachineIndex(d) - 1) + margin.top + y.bandwidth())
    .attr("dy", "0.35em")
    .attr("dx", -4)
    .attr("id", (d) => d.OperationIndex + "innerrecttext")
    .text(function (d) {
      var v = "Job " + d.JobId + " Op " + d.OperationIndex;
      return v;
    })
    .attr("display", d => (((d.EndTimeInInt - d.StartTimeInInt) / max) < 0.09) ? "none" : "block");

  svg.append("g")
    .call(xAxis);

  svg.append("g")
    .call(yAxis);

  var title = svg
    .append("text")
    .text("Gantt Chart")
    .attr("x", chartWidth / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .attr("font-size", 32)
    .attr("fill", "#FFF");

  //Turn off tooltip function
  if (document.contains(document.getElementById("myCheck"))) { }
  else {
    var checkbox = document.createElement('input');
    checkbox.setAttribute("type", "checkbox");
    checkbox.value = 1;
    checkbox.id = "myCheck";

    var checkboxtext = document.createElement('div');
    checkboxtext.id = "checkboxText"
    checkboxtext.innerHTML = "Tooltip turn off  ";

    document.getElementById('chartDiv').prepend(checkboxtext);
    document.getElementById("checkboxText").append(checkbox);
  }

  drawList(data);
  Criterion();
  CalculationKPI(data, "jobleadtime");
  CalculationKPI(data, "setups");
  CalculationKPI(data, "allocation");
  CalculationKPI(data, "waiting");
  CalculationKPI(data, "sparetime");

  Occupancy();
  DueDate();
  //drawDuedateBarChart();
}

//Chart xAxis ticks data - days
function addDays(date, days) {
  var result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getMachineIndex(d) {
  for (i in machines) {
    for (j in machines[i].OperationListById) {
      if (d.OperationId == machines[i].OperationListById[j]) {
        return machines[i].Id;
      }
    }
  }
}

//Unique jobs selection
function checkUniqueJob(jobs) {
  for (let i = 0; i < data.length; i++) {
    var count = 0;
    for (let j = 0; j < jobs.length; j++) {
      if (data[i].JobId === jobs[j]) {
        count++;
      }
    }
    if (count === 0) {
      jobs.push(data[i].JobId);
    }
  }
}

//Load .json
function loadFile() {
  var input, file, fr;

  if (typeof window.FileReader !== "function") {
    alert("The file API isn't supported on this browser yet.");
    return;
  }

  input = document.getElementById("fileinput");
  if (!input) {
    alert("Um, couldn't find the fileinput element.");
  } else if (!input.files) {
    alert(
      "This browser doesn't seem to support the `files` property of file inputs."
    );
  } else if (!input.files[0]) {
    alert("Please select a file before clicking 'Load'");
  } else {
    var label = document.getElementById("inputfile_name");
    file = input.files[0];
    label.innerHTML = file.name;
    fr = new FileReader();
    fr.readAsText(file);
    fr.onload = receivedText;
  }
}

var chooseBtn = document.getElementById("fileinput");
var label = document.getElementById("inputfile_name");
var labelvalue = label.innerHTML;
chooseBtn.addEventListener('change', function (e) {
  let filename = '';
  filename = e.target.value.split('\\').pop();
  if (filename) {
    label.innerHTML = filename;
  }
  else {
    label.innerHTML = labelvalue;
  }
});

function receivedText(e) {
  let lines = e.target.result;
  data = JSON.parse(lines);
  drawDiagram(data);
  openTab(event, 'list', 'main');
}

//Tabpanel (main,kpi)
function openTab(evt, id, type) {
  var i, tabcontent, tablinks;
  if (type == "main") tabcontent = document.getElementsByClassName("maintabcontent");
  else if (type == "achievement") tabcontent = document.getElementsByClassName("tabcontent");

  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(id).style.display = "block";
  evt.currentTarget.className += " active";
}

//Representation of operation's properties
function drawList(data) {
  var divv = document.getElementById('list');
  var tbl = document.createElement('table');
  tbl.style = "table";
  // tbl.style.width = "40%";
  for (let i = 0; i < data.length + 1; i++) {
    var tr = document.createElement('tr');
    for (let j = 0; j < 11; j++) {
      var tdd = document.createElement("td");
      tdd.appendChild(document.createTextNode('\u0020'))
      if (i == 0) {
        switch (j) {
          case 0:
            tdd.innerHTML = "Operation Id";
            break;
          case 1:
            tdd.innerHTML = "Operation Name";
            break;
          case 2:
            tdd.innerHTML = "Job Id";
            break;
          case 3:
            tdd.innerHTML = "Job Name";
            break;
          case 4:
            tdd.innerHTML = "Operation Index";
            break;
          case 5:
            tdd.innerHTML = "Start Time Of Operation";
            break;
          case 6:
            tdd.innerHTML = "End Time Of Operation";
            break;
          case 7:
            tdd.innerHTML = "Release Date Of Operation";
            break;
          case 8:
            tdd.innerHTML = "Due Date Of Job";
            break;
          case 9:
            tdd.innerHTML = "Setup Time In Minutes";
            break;
          case 10:
            tdd.innerHTML = "Priority";
            break;

        }
      }
      else {
        switch (j) {
          case 0:
            tdd.innerHTML = data[i - 1].OperationId;
            break;
          case 1:
            tdd.innerHTML = data[i - 1].OperationName;
            break;
          case 2:
            tdd.innerHTML = data[i - 1].JodId;
            break;
          case 3:
            tdd.innerHTML = data[i - 1].JobName;
            break;
          case 4:
            tdd.innerHTML = data[i - 1].OperationIndex;
            break;
          case 5:
            tdd.innerHTML = data[i - 1].StartTime;
            break;
          case 6:
            tdd.innerHTML = data[i - 1].EndTime;
            break;
          case 7:
            tdd.innerHTML = data[i - 1].ReleaseDateTime;
            break;
          case 8:
            tdd.innerHTML = data[i - 1].DueDateTime;
            break;
          case 9:
            tdd.innerHTML = data[i - 1].SetupTimeInInt;
            break;
          case 10:
            tdd.innerHTML = data[i - 1].Priority;
            break;

        }
      }

      tr.appendChild(tdd);
    }
    tbl.appendChild(tr);
  }
  divv.appendChild(tbl);
}

function Criterion() {
  var criterionOptions = ["Cmax", "ΣCi", "Lmax", "Tmax"];
  for (let i = 0; i < criterionOptions.length; i++) {
    createCrTable(criterionOptions[i]);
  }
}

function createCrTable(selectedOption) {
  var div = document.getElementsByName('optimality')[0];
  var tbl = document.createElement('table');
  tbl.className = "crtable"
  tbl.style = "table";
  tbl.style.width = '50%';

  var labell = document.createElement('label');
  switch (selectedOption) {
    case "Cmax":
      labell.innerHTML = "End of the last operation";
      var tr = document.createElement('tr');
      for (let index = 0; index < 3; index++) {
        var td = document.createElement('td');
        td.appendChild(document.createTextNode('\u0020'))
        max = d3.max(data, function (d) {
          return d.EndTimeInInt;
        });
        if (index == 0) td.innerHTML = "Cmax";
        else if (index == 1) {
          for (let i = 0; i < data.length; i++) {
            if (data[i].EndTimeInInt == max) {
              td.innerHTML = "End on " + " machine " + getMachineIndex(data[i]);
            }
          }
        }
        else {
          for (let i = 0; i < data.length; i++) {
            if (data[i].EndTimeInInt == max) {
              td.innerHTML = data[i].EndTime + "( in munites: " + data[i].EndTimeInInt + " )";
            }
          }
        }
        tr.appendChild(td);
      }
      tbl.appendChild(tr);
      break;

    case "ΣCi":
      labell.innerHTML = "Time of execution of operations (in minutes)";
      var sum = 0;
      for (let index = 0; index < data.length; index++) {
        sum += (data[index].EndTimeInInt - data[index].StartTimeInInt);
      }

      var tr = document.createElement('tr');
      for (let index = 0; index < 2; index++) {
        var td = document.createElement('td');
        td.appendChild(document.createTextNode('\u0020'))
        if (index == 0) {
          td.innerHTML = "ΣCi";
        }
        else td.innerHTML = sum;
        tr.appendChild(td);
      }
      tbl.appendChild(tr);
      break;

    case "Lmax":
      labell.innerHTML = "Number of lateness per job";
      for (let index = 0; index < uniquejobs.length; index++) {
        var tr = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))
          if (j == 0) {
            td.innerHTML = "Job " + uniquejobs[index];
          }
          else {
            let tempjobs = [];
            data.forEach(element => {
              if (element.JobId == uniquejobs[index]) {
                tempjobs.push(element);
              }
            });

            td.innerHTML = ((d3.max(tempjobs, function (d) {
              return d.EndTimeInInt;
            })) - d3.max(tempjobs, d => d.DueDateTimeInInt));
          }
          tr.appendChild(td);
        }
        tbl.appendChild(tr);
      }
      break;

    case "Tmax":
      labell.innerHTML = "Number of tardiness per job";
      for (let index = 0; index < uniquejobs.length; index++) {
        tr = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))
          if (j == 0 && i != 0) {
            td.innerHTML = "Job " + uniquejobs[index];
          }
          else {
            let tempjobs = [];
            data.forEach(element => {
              if (element.JobId == uniquejobs[index]) {
                tempjobs.push(element);
              }
            });
            if (((d3.max(tempjobs, function (d) {
              return d.EndTimeInInt;
            })) - d3.max(tempjobs, d => d.DueDateTimeInInt)) < 0) {
              td.innerHTML = 0;
            }
            else {
              td.innerHTML = (d3.max(tempjobs, function (d) {
                return d.EndTimeInInt;
              })) - d3.max(tempjobs, d => d.DueDateTimeInInt);
            }
          }
          tr.appendChild(td);
        }
        tbl.appendChild(tr);
      }
      break;
  }
  div.appendChild(labell);
  div.appendChild(tbl);
}

//Kihasználtság (rendszer, gépenként %-ban)
function Occupancy() {

  var div = document.getElementsByName('occupancy')[0];
  var tbl = document.createElement('table');
  tbl.style = "table";
  tbl.id = "octable";
  tbl.style.width = '50%';

  var c = -1; //segédváltozó indexeléshez
  for (let i = 0; i < machines.length + 1; i++) {
    var tr = document.createElement('tr');
    for (let j = 0; j < 2; j++) {
      var td = document.createElement('td');
      td.appendChild(document.createTextNode('\u0020'))

      if (i == 0 && j == 0) td.innerHTML = "Utilization:";
      if (i == 0 && j == 1) td.innerHTML = Math.round((utilization / utilizationsum) * 100, 1) + "%";
      if (i != 0 && j == 0) {
        c++;
        td.innerHTML = machines[c].Name;
      }
      if (i != 0 && j == 1) {
        td.innerHTML = Math.round((utilizationmachine[i - 1] / maxtopermachine[i - 1]) * 100, 1) + "%";
      }
      tr.appendChild(td);
    }
    tbl.appendChild(tr);
  }
  div.appendChild(tbl);
}

//Határidő
function DueDate() {
  //SZÁMÍTÁSOK
  //Késésre, sietésre vonatkozó
  //Count
  for (let i = 0; i < uniquejobs.length; i++) {
    var maxtojob = 0;
    var jobdue = 0;
    var datas = [];
    for (let j = 0; j < data.length; j++) {
      if (data[j].JobId == uniquejobs[i]) {
        datas.push(data[j]);
        maxtojob = d3.max(datas, d => (d.EndTimeInInt))
        jobdue = datas[0].DueDateTimeInInt;
      }
    }
    if (jobdue < maxtojob) {
      tardinesscount += 1;
    }
    if (jobdue > maxtojob) {
      earlinesscount += 1;
    }
    tardinessjob.push(maxtojob - jobdue); //késés mértéke jobonként, lehet negatív, pozitív is
  }

  //Sum, Max
  for (let i = 0; i < tardinessjob.length; i++) {
    if (tardinessjob[i] < 0) earlinesssum += (-1) * tardinessjob[i];
    else {
      tardinesssum += tardinessjob[i];
      tardinessmax = d3.max(tardinessjob, d => (d))
    }
  }

  //Avg
  tardinessavg = Math.round(tardinesssum / tardinesscount);
  earlinessavg = Math.round(earlinesssum / earlinesscount);

  jobintime.push(tardinesscount); //késő munkák száma
  jobintime.push(uniquejobs.length - tardinesscount); //időben lévők száma

  //Kirajzolás
  var div = document.getElementsByName('due')[0];
  var tbl = document.createElement('table');
  tbl.className = "duetable"
  tbl.style = "table";
  tbl.style.width = '50%';
  var buttondue = document.createElement('button');
  buttondue.innerHTML = "Representation on a chart"
  buttondue.onclick = function () {
    drawPieDiagram(jobintime, "dueChart");
  }

  for (let i = 0; i < 3; i++) {
    if (i == 0) {//Jobonkénti határidő
      for (let index = 0; index < uniquejobs.length; index++) {
        var tr = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))
          if (j == 0) {
            td.innerHTML = " job" + uniquejobs[index];
          }
          else {
            data.forEach(element => {
              if (element.JobId == uniquejobs[index]) {
                td.innerHTML = data[i].EndTime + "( in munites: " + data[i].EndTimeInInt + " )";
              }
            });
          }
          tr.appendChild(td)
        }
        tbl.appendChild(tr);
      }
      div.appendChild(tbl);
      div.appendChild(buttondue);
    }
    if (i == 1) { //Csúszások mutatója
      for (let index = 0; index < 4; index++) {
        var tr = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))
          if (j == 0 && index == 0) td.innerHTML = "Number of delays";
          if (j == 0 && index == 1) td.innerHTML = "Max of delays";
          if (j == 0 && index == 2) td.innerHTML = "Sum of delays";
          if (j == 0 && index == 3) td.innerHTML = "Average of delays";
          if (j == 1 && index == 0) td.innerHTML = tardinesscount;
          if (j == 1 && index == 1) {
            for (let k = 0; k < data.length; k++) {
              var tardinessmaxjob = 0;
              if ((data[k].EndTimeInInt - data[k].DueDateTimeInInt) == tardinessmax) {
                tardinessmaxjob = data[k].JobId;
              }
            }
            td.innerHTML = tardinessmax + " (Job " + tardinessmaxjob + ")";
          }
          if (j == 1 && index == 2) td.innerHTML = tardinesssum;
          if (j == 1 && index == 3) td.innerHTML = tardinessavg;
          tr.appendChild(td)
        }
        tbl.appendChild(tr);
      }
      div.appendChild(tbl);
    }
    if (i == 2) { //Siető munkák mutatója
      for (let index = 0; index < 3; index++) {
        var tr = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))
          if (j == 0 && index == 0) td.innerHTML = "Number of earliness";
          if (j == 0 && index == 1) td.innerHTML = "Sum of earliness";
          if (j == 0 && index == 2) td.innerHTML = "Average of earliness";
          if (j == 1 && index == 0) td.innerHTML = earlinesscount;
          if (j == 1 && index == 1) td.innerHTML = earlinesssum;
          if (j == 1 && index == 2) td.innerHTML = earlinessavg;
          tr.appendChild(td)
        }
        tbl.appendChild(tr);
      }
      div.appendChild(tbl);
    }
  }
}

function CalculationKPI(data, sel) {
  //SZÁMÍTÁSOK
  //Rendszer terheltsége
  if (isopsuminitialized == false) {
    for (let i = 0; i < data.length; i++) {
      ;
      operationsum += 1;
    }
    isopsuminitialized = true;
  }
  //Várakozás idők gépenként
  //Üzemkihasználtság gépenként
  //Terheltség gépenként
  //utilization = (machines.length * d3.max(data, d => (d.EndTimeInInt)))
  // operationsummachine.push(operationsum);

  for (let j = 0; j < machines.length; j++) {
    seged = [];
    for (let m = 0; m < data.length; m++) {
      for (let l = 0; l < machines[j].OperationListById.length; l++) {
        if (data[m].OperationId == machines[j].OperationListById[l]) {
          seged.push(data[m]);
        }
      }
    }
    wait = d3.max(seged, d => d.EndTimeInInt);
    maxtopermachine.push(wait);

    if (isutilizationinitialized == false) {
      utilization += wait;
      utilizationsum += wait;

      console.log(utilization);
      var operationsumpermachine = 0;
      for (let i = 0; i < data.length; i++) {
        for (let k = 0; k < machines[j].OperationListById.length; k++) {
          if (data[i].OperationId == machines[j].OperationListById[k]) {
            wait -= (data[i].EndTimeInInt - data[i].StartTimeInInt);
            wait -= data[i].SetupTimeInInt;
            operationsumpermachine += 1;
          }
        }
      }
      console.log(wait);
      utilization -= wait; //Rendszer kihasználtság, mennyit ment, a várakozást vonod ki
      if (isarraysinitialized == false && j < machines.length) {
        utilizationmachine.push((d3.max(seged, function (d) {
          return d.EndTimeInInt;
        })) - wait); // Gépenkénti kihasználtság (mennyit ment)
        operationsummachine.push(operationsumpermachine); //Gépenkénti terhelés(mennyi ment rajta)
        waitarray.push(wait); //Várakozási idő gépenként

      }
    }
    seged = [];

  }

  isarraysinitialized = true;
  isutilizationinitialized = true;

  //Befoglaló tábla
  var div = document.getElementsByName('kpi')[0];
  var tbl = document.createElement('table');
  tbl.style = "table";
  tbl.id = "kpitable";
  tbl.style.width = '50%';

  //SZEPARÁLVA
  switch (sel) {
    case "jobleadtime":
      //Átfutási idők
      for (let i = 0; i < uniquejobs.length; i++) {
        //segédváltozók:
        var jobleadtimes = 0;
        var jobltwithsetups = 0;
        for (let j = 0; j < data.length; j++) {
          if (data[j].JobId == uniquejobs[i]) {
            jobleadtimes += (data[j].EndTimeInInt - data[j].StartTimeInInt);

            jobltwithsetups += (data[j].EndTimeInInt - data[j].StartTimeInInt) + data[j].SetupTimeInInt;
          }
        }
        jobleadtime.push(jobleadtimes);
        jobltwithsetup.push(jobltwithsetups);
      }

      var labelleadtime = document.createElement('label');
      labelleadtime.innerHTML = "Lead time of jobs, without and with setup time";
      for (let i = 0; i < uniquejobs.length; i++) {
        var tr = document.createElement('tr');
        for (let j = 0; j < 3; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))

          if (j == 0) td.innerHTML = "Job " + uniquejobs[i];
          if (j == 1) td.innerHTML = jobleadtime[i];
          if (j == 2) td.innerHTML = jobltwithsetup[i];

          tr.appendChild(td);
        }
        tbl.appendChild(tr);
      }
      div.appendChild(labelleadtime);
      break;

    case "setups":
      //Átállási idők
      for (let index = 0; index < data.length; index++) {
        setupsum += data[index].SetupTimeInInt;
        maxsetup = d3.max(data, d => (d.SetupTimeInInt))
        if (data[index].SetupTimeInInt > 0) {
          setupcount += 1;
        }
      }
      var labelsetup = document.createElement('label');
      labelsetup.innerHTML = "Sum, max of setup times, number of setups";
      for (let i = 0; i < 3; i++) {
        var tr = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))

          if (j == 0 && i == 0) td.innerHTML = "Sum";
          if (j == 1 && i == 0) td.innerHTML = setupsum;
          if (j == 0 && i == 1) td.innerHTML = "Max";
          if (j == 1 && i == 1) td.innerHTML = maxsetup;
          if (j == 0 && i == 2) td.innerHTML = "Count";
          if (j == 1 && i == 2) td.innerHTML = setupcount;

          tr.appendChild(td);
        }
        tbl.appendChild(tr);
      }
      div.appendChild(labelsetup);
      break;

    case "allocation":
      //Terheltség
      var labeluti = document.createElement('label');
      labeluti.innerHTML = "System/ Machine allocation";
      var buttonuti = document.createElement('button');
      buttonuti.innerHTML = "Representation on a chart"
      buttonuti.onclick = function () {
        drawPieDiagram(operationsummachine, "kpiChart");
      }
      for (let i = 0; i < operationsummachine.length + 1; i++) {
        var tr = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))

          if (j == 0 && i == 0) td.innerHTML = "System allocation rate";
          if (j == 1 && i == 0) td.innerHTML = operationsum;
          if (j == 0 && i != 0) td.innerHTML = machines[i - 1].Name;
          if (j == 1 && i != 0) td.innerHTML = operationsummachine[i - 1];

          tr.appendChild(td);
        }
        tbl.appendChild(tr);
      }
      div.appendChild(labeluti);
      div.appendChild(buttonuti);
      break;

    case "waiting":
      //Várakozási idők
      var labelwait = document.createElement('label');
      labelwait.innerHTML = "The waiting of machines";
      var buttonwait = document.createElement('button');
      buttonwait.innerHTML = "Representation on a chart"
      buttonwait.onclick = function () {
        drawWaitBarDiagram();
      }
      for (let i = 0; i < machines.length; i++) {
        var tr = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))

          if (j == 0) td.innerHTML = machines[i].Name;
          if (j == 1) td.innerHTML = waitarray[i];

          tr.appendChild(td);
        }
        tbl.appendChild(tr);
      }
      div.appendChild(labelwait);
      div.appendChild(buttonwait);
      break;

    case "sparetime":
      //Tartalékidők operációnként
      for (let i = 0; i < data.length; i++) {
        sparetimeoperation.push(data[i].EndTimeInInt - data[i].ReleaseDateTimeInInt);
      }
      var labelspare = document.createElement('label');
      labelspare.innerHTML = "Spare time of operations";

      for (let i = 0; i < data.length; i++) {
        var tr = document.createElement('tr');
        for (let j = 0; j < 4; j++) {
          var td = document.createElement('td');
          td.appendChild(document.createTextNode('\u0020'))

          if (j == 0) td.innerHTML = "Job " + data[i].JobId + " Operation " + data[i].OperationIndex;
          if (j == 1) td.innerHTML = data[i].EndTimeInInt;
          if (j == 2) td.innerHTML = data[i].ReleaseDateTimeInInt;
          if (j == 3) td.innerHTML = sparetimeoperation[i];


          tr.appendChild(td);
        }
        tbl.appendChild(tr);
      }
      div.appendChild(labelspare);
      break;
  }
  div.appendChild(tbl);

}

//Show red-green innerrects in the chart
function showDueDate() {
  showDueChecked += 1;
  for (let i = 0; i < data.length; i++) {
    var currentinnerrect = document.getElementById(data[i].OperationId + "innerrect");
    if (showDueChecked > 0 && showDueChecked % 2 == 0) {
      currentinnerrect.style.opacity = 0.0;
    }
    else currentinnerrect.style.opacity = 1.0;
  }
}

//Várakozás
function drawWaitBarDiagram() {
  console.log(waitarray);
  width = 500;
  height = 500;

  margin = ({ top: 20, right: 0, bottom: 30, left: 40 })
  if (typeof waitChart === 'undefined') {
    const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("width", "60%")
      .attr("height", "60%")
      .attr("id", "waitChart")
    x = d3.scaleBand()
      .domain(machines.map(d => d.Name))
      .range([margin.left, width - margin.right])
      .padding(0.1)

    y = d3.scaleLinear()
      .domain([0, d3.max(waitarray, (d) => d)])
      .range([500 - margin.bottom, margin.top])

    const g = svg.append("g")
      .attr("class", "bars")
      .attr("fill", "red")
      .selectAll("rect")
      .data(waitarray)
      .join("rect")
      .attr("x", (d, i) => x(machines[i].Name) + 70)
      .attr("y", (d, i) => y(d))
      .attr("height", (d) => y(0) - y(d))
      .attr("width", x.bandwidth() - 50)
      .attr("transform",
        "translate(" + margin.left + "," + ")");

    xAxis = g => g
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))

    yAxis = g => g
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .call(g => g.select(".domain").remove())

    svg.append("g")
      .attr("class", "x-axis")
      .call(xAxis);

    svg.append("g")
      .attr("class", "y-axis")
      .call(yAxis);
    document.getElementById("kpiChart").appendChild(svg.node());
  }
}

//Kördiagramok terheltségre, határidőre
function drawPieDiagram(piechartdata, location) {
  var width = 450
  height = 450
  margin = 40
  var tooltipslice = document.createElement("div");
  var radius = Math.min(width, height) / 2 - margin
  if (typeof chartPie === 'undefined') {
    var svg = d3.select("#" + location)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("position", "relative")
      .attr("top", 0)
      .attr("right", 0)
      .attr("id", "chartPie")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var chartdata = piechartdata;
    //chartdata.splice(0, 1);

    var color = d3.scaleOrdinal()
      .domain(chartdata)
      .range(d3.schemeSet2);

    var pie = d3.pie()
      .value(function (d) { return d.value; })
    var data_ready = pie(d3.entries(chartdata))

    var arcGenerator = d3.arc()
      .innerRadius(0)
      .outerRadius(radius)

    svg
      .selectAll('mySlices')
      .data(data_ready)
      .enter()
      .append('path')
      .attr('d', arcGenerator)
      .attr('fill', function (d) { return (color(d.value + Math.random())) })
      .attr("stroke", "black")
      .style("stroke-width", "2px")
      .style("opacity", 0.7)
      .on("mouseover", function (e, i) {
        console.log("valamiii" + location);
        if (location == "kpiChart") {


          tooltipslice.style.opacity = 0.9;
          tooltipslice.innerHTML = machines[i].Name + " " + e.value + " op" + (e.value / operationsum) * 100 + "%";
          tooltipslice.style.left = 110 + 10 + "px";
          tooltipslice.style.top = 170 + "px";
          tooltipslice.style.display = "inline";

        }
        if (location == "due") {
          tooltipslice.style.opacity = 0.9;
          tooltipslice.innerHTML = machines[i].Name + " " + e.value + " op" + (e.value / operationsum) * 100 + "%";
          tooltipslice.style.left = x(e.value) + 10 + "px";
          tooltipslice.style.top = y(e.value) + 170 + "px";
          tooltipslice.style.display = "inline";
          console.log(x(e.value) + 10);
          console.log(y(e.value) + 170);
        }
        document.getElementById(location).append(tooltipslice);
      }).on("mouseout", function (e) {
        tooltipslice.style.display = "none";
      })

    svg
      .selectAll('mySlices')
      .data(data_ready)
      .enter()
      .append('text')
      .text(function (d, i) {
        if (location == "kpiChart") {
          return machines[i].Name + " " + d.value + " operations"
        }
        else return d.value + " jobs"
      })
      .attr("transform", function (d) { return "translate(" + arcGenerator.centroid(d) + ")"; })
      .attr("display", function () {
        if (chartdata.length > 10) return "none"
        else return "block"
      })
      .style("text-anchor", "middle")
      .style("font-size", 14)

    var buttonbar = document.createElement('button');
    buttonbar.innerHTML = "Change to bar chart"
    buttonbar.id = "buttonBar"
    buttonbar.onclick = function () {
      svg.display = "none";
      if (location == "kpiChart") {
        //document.getElementById("chartPie").style.display="none";
        //WTF miért nem ?  var elem = document.getElementById("chartPie").remove();

        drawAllocationBarDiagram(piechartdata);
        var elem = document.getElementById("chartPie");

        elem.remove();

        var selelem = document.getElementById("buttonBar");
        selelem.remove();
      }

    };
    // else drawDueBarDiagram();
  }
  var div = document.getElementsByName(location)[0];
  div.appendChild(buttonbar);
}

//Oszlopdiagram terheltségre
function drawAllocationBarDiagram(operationsummachine) {
  width = 350;
  height = 350;

  //Data
  var chartdata = operationsummachine;

  if (typeof chartAllocation === 'undefined') {
    margin = ({ top: 20, right: 20, bottom: 30, left: 70 })
    const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height])
      .attr("width", 420)
      .attr("height", 420)
      .attr("id", "chartAllocation")
      .attr("position", "relative")
      .attr("top", 0)
      .attr("right", 0)


    x = d3.scaleBand()
      .domain(machines.map(d => d.Name))
      .range([margin.left, width - margin.right])
      .padding(0.1)

    y = d3.scaleLinear()
      .domain([0, d3.max(chartdata, (d) => d)])
      .range([height - margin.bottom, margin.top])

    const g = svg.append("g")
      .attr("class", "bars")
      .attr("fill", "red")
      .selectAll("rect")
      .data(chartdata)
      .join("rect")
      .attr("x", (d, i) => x(machines[i].Name))
      .attr("y", (d, i) => y(d))
      .attr("height", (d) => y(0) - y(d))
      .attr("width", x.bandwidth() - 50)
      .attr("transform",
        "translate(" + margin.left + "," + ")");

    xAxis = g => g
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x).tickSizeOuter(0))

    yAxis = g => g
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y))
      .call(g => g.select(".domain").remove())

    svg.append("g")
      .attr("class", "x-axis")
      .call(xAxis);

    svg.append("g")
      .attr("class", "y-axis")
      .call(yAxis);
    document.getElementById("kpiChart").appendChild(svg.node());
  }
}

function drawDuedateBarChart() {

  console.log(tardinessjob);
  var margin = { left: 20, right: 30, top: 30, bottom: 0 };
  var barWidth = 30;  // Width of the bars
  var chartHeight = 350;  // Height of chart, from x-axis (ie. y=0)
  var chartWidth = 400;

  var yScale = d3.scaleLinear()
    .domain([0, d3.max(tardinessjob)+1])
    .range([0, chartHeight]);


  var yAxisScale = d3.scaleLinear()
    .domain([d3.min(tardinessjob), d3.max(tardinessjob)+1])
    .range([chartHeight - yScale(d3.min(tardinessjob)), 0])



  var svg = d3.create('svg');
  svg
    .attr('height', chartHeight + 150)
    .attr('width', chartWidth + 100)
    .attr("padding","30px")
    .style('border', '1px solid');

  svg
    .selectAll("rect")
    .data(tardinessjob)
    .enter()
    .append("rect")
    .attr("x", function (d, i) { return margin.left + (i * 1.5) * barWidth + 20; })
    .attr("y", function (d, i) { return chartHeight - Math.max(0, yScale(d)); })
    .attr("height", function (d) { return Math.abs(yScale(d)); })
    .attr("width", barWidth)
    .attr("padding-right", "20")
    .style("fill", function (d) {
      if (d > 0) {
        return "red";
      }
      if (d < 0) return "green";
    })
    .style("stroke", "black")

    .style("opacity", function (d, i) { return 1 });

  var yAxis = d3.axisLeft(yAxisScale);


  svg.append("g")
    .attr("fill", "black")
    .attr("text-anchor", "end")
    .attr("font-family", "sans-serif")
    .attr("font-size", 12)
    .selectAll("text")
    .data(tardinessjob)
    .join("text")
    .attr("x", function (d, i) { return 34 + margin.left + (i * 1.5) * barWidth + 20; })
    .attr("y", function (d, i) { return -5+chartHeight - Math.max(0, yScale(d)); })
    .attr("dy", "0.35em")
    .attr("dx", -4)
    .text((d,i) => "Job "+i+1)

  svg.append('g')
    .attr('transform', function (d) {
      return 'translate(' + margin.left + ', 0)';
    })
    .call(yAxis);


  document.getElementById("kpiChart").appendChild(svg.node());

}
