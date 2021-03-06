string output = "";

function concatString (string value) {
    output = output + value + " ";
}

function concatIntString (int i, string v) {
    output = output + i + ":" + v + " ";
}

json j1 = {name:"bob", age:10, pass:true, subjects:[{subject:"maths", marks:75}, {subject:"English", marks:85}]};

function testJSONObject () returns (string) {
    output = "";
    foreach j in j1 {
        concatString(j.toString());
    }
    return output;
}

function testJSONArray () returns (string) {
    output = "";
    foreach j in j1.subjects {
        concatString(j.toString());
    }
    return output;
}

function testArrayOfJSON () returns (string) {
    output = "";
    var array, _ = (json[]) j1.subjects;
    foreach i, j in array {
        concatIntString(i, j.toString());
    }
    return output;
}

function testJSONString () returns (string) {
    output = "";
    foreach j in j1.name {
        concatString(j.toString());
    }
    return output;
}

function testJSONNumber () returns (string) {
    output = "";
    foreach j in j1.age {
        concatString(j.toString());
    }
    return output;
}

function testJSONBoolean () returns (string) {
    output = "";
    foreach j in j1.pass {
        concatString(j.toString());
    }
    return output;
}

function testJSONNull () returns (string) {
    output = "";
    foreach j in j1.city {
        concatString(j.toString());
    }
    return output;
}

struct Protocols {
    string data;
    Protocol[] plist;
}

struct Protocol {
    string name;
    string url;
}

function testJSONToStructCast () returns (string) {
    json j = {data:"data", plist:[{name:"a", url:"h1"}, {name:"b", url:"h2"}]};
    var protocolsData, _ = <Protocols>j;
    output = "";
    foreach protocol in protocolsData.plist {
        concatString(protocol.name + "-" + protocol.url);
    }
    return output;
}

function testAddWhileIteration () returns (string) {
    output = "";
    foreach j in j1 {
        if (j.toString() == "bob") {
            j1["lastname"] = "smith";
        }
        concatString(j.toString());
    }
    foreach j in j1 {
        concatString(j.toString());
    }
    return output;
}

function testDeleteWhileIteration () returns (string) {
    output = "";
    foreach j in j1 {
        if (j.toString() == "bob") {
            j1.remove("subjects");
        }
        concatString(j.toString());
    }
    foreach j in j1 {
        concatString(j.toString());
    }
    return output;
}
