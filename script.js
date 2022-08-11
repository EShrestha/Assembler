// Repo clone test

//////// HTML Elements
const convertBtn = document.getElementById("convertBtn");
const fileNameInput = document.getElementById("fileNameInput");
const downloadFileBtn = document.getElementById("downloadFileBtn");
const txtInput = document.getElementById("txtInput");
const txtOutputBin = document.getElementById("txtOutputBin");
const txtOutputHex = document.getElementById("txtOutputHex");
const txtOutputHexOneline = document.getElementById("txtOutputHexOneline");

//////// Global Variables
var hexFileData = "";
var binFileData = "";



//////// Helper Functions

const setText = (txtArea, text) => {
    txtArea.value = text;
}

const getInstructions = () => {
    return txtInput.value.trim().split("\n");
}

const cleanse2 = (instructions) => {
    // -2
    // -1
    // @start
    // 1
    // 2
    // 3
    // 4
    // #Definition
    // 5
    // 6
    // #Definition2
    // MOVT

    //   0   1     2    3  4  5  6        7      8  9        10   
    // [-2, -1, @start, 1, 2, 3, 4, #Definition, 5, 6, #Definition2]
    let cleansedInstructions = instructions;
    instructions.forEach((value, i) => {
        if (value.includes("@")) {
            let index = i;
            let definitionIndex = i;
            for (let j = i; j < instructions.length; j++){
                if (!(instructions[j].includes("#"))) { 
                    definitionIndex++;
                } else if (value.replace("@", "#") == instructions[j]) {
                    break;
                }
            }
            let substitute = `B{l} 0x${(definitionIndex - index - 2).toString(16)}`;
            console.log("@ index is:", index);
            console.log("Definition found at index:", definitionIndex);
            console.log("B offset:", (definitionIndex - index - 2).toString(16))
            instructions.splice(index, 1, substitute);
        }
    });
    return instructions;

}

const cleanse = (instructions) => {
    instructions.forEach((value, i) => {
        if (value.includes("@")) {
            let index = i;
            let definitionIndex = 0;
            let hashCount = 0;
            for (let j = 0; j < instructions.length; j++){
                if (value.replace("@", "#") == instructions[j]) {
                    break;
                }
                if (instructions[j].includes("#") && instructions[j] != value.replace("@", "#")) {
                    hashCount++;
                }
                definitionIndex++;
            }
            let sign = definitionIndex < index ? "-" : "";
            let num = definitionIndex < index ? -2 : -2;
            let direction = definitionIndex < index ? 1 : 0; // Have to add 1 if going in negative direction so it lands on instruction not #definition
            let diffHashCountNum = definitionIndex < index ? hashCount : 0; // TODO calculate index offset based on how many #Definition are between the target #Definition based on direction
            
            let substitute = `B{l} ${sign}0x${(definitionIndex - index + num + direction).toString(16)}`;
            console.log(value+" i is:", index);
            console.log("#Definition found at index:", definitionIndex);
            console.log("Definitions Count:", hashCount);
            console.log("B offset:", (definitionIndex - index + num + direction));
            console.log(`${definitionIndex} - ${index} + ${num} + ${direction}`);
            instructions.splice(index, 1, substitute);
        }
    });
    return instructions;

}

const hexToDecimal = (hex) => {
    return parseInt(hex, 16);
}


const hexToBin = (hex, padAmount) => {
    // Accept in format: 0xABCD or -1 or -0x0013

    switch (true) {
        case hex.includes("0x") && hex.includes("-"):
            let decimal = hexToDecimal(hex.replace("-0x", ""));
            let rVal = (~(Number(decimal)) + 1 >>> 0).toString(2);
            return (rVal.length > padAmount) ? getSubStringBin(rVal.length - padAmount, rVal.length, rVal) : rVal.padStart(padAmount, '1');
        case hex.includes("0x"):
            return (parseInt(hex.replace("0x", ""), 16).toString(2)).padStart(padAmount, '0');
        case hex.includes("-"):
            let rv = (~(Number(hex.replace("-", ""))) + 1 >>> 0).toString(2);
            return (rv.length > padAmount) ? getSubStringBin(rv.length - padAmount, rv.length, rv) : rv.padStart(padAmount, '1');
    }
    return (parseInt(hex, 16).toString(2)).padStart(padAmount, '0');  
}

const binToHex = (binary) => {
    return parseInt(binary, 2).toString(16).toUpperCase();
}

const splitAndReverseHex = (hexStr) => {
    // AB CD will return CD AB
    let match = hexStr.match(/.{1,2}/g);
    match.reverse();
    return match.join(" ");
}

const getRegisterInBin = (register) => {
    let hex = register.replace("(", "").replace(")", "").replace("R", "");
    if (register.includes("R") && Number(hex) >= 10) {
        console.log("===============")
        console.log("DEC:", hex);
        console.log("BIN:", Number(hex).toString(2));
        return Number(hex).toString(2).padStart(4, "0");
    }
    console.log("Trying to convert Register to bin:", hex);
    return hexToBin(hex).padStart(4,"0");
}

const insGetSpecial = (instruction) => {
    // sub{s} will return s
    let r = /\{.*?\}/g;
    let m = instruction.match(r);
    if (!m) { console.log("Special not found"); return ""; }
    if (m[0]) {
        return m[0];
    }
    else {
        console.log("Special not found.");
        return "";
    }
}

const insGetConditionCode = (instruction) => {
    let r = /\<.*?\>/g;
    let m = instruction.match(r);
    if (!m) { return "1110"; }
    if (m[0]) {
        let condition = m[0];
        switch (true) {
            case condition.includes("EQ"):
                return "0000";
            case condition.includes("NE"):
                return "0001";
            case condition.includes("CS"):
                return "0010";
            case condition.includes("CC"):
                return "0011";
            case condition.includes("MI"):
                return "0100";
            case condition.includes("PL"):
                return "0101";
            case condition.includes("VS"):
                return "0110";
            case condition.includes("VC"):
                return "0111";
            case condition.includes("HI"):
                return "1000";
            case condition.includes("LS"):
                return "1001";
            case condition.includes("GE"):
                return "1010";
            case condition.includes("LT"):
                return "1011";
            case condition.includes("GT"):
                return "1100";
            case condition.includes("LE"):
                return "1101";
            case condition.includes("AL"):
                return "1110";
        }
        console.log("Condition not found, returning AL");
        return "1110"
    }
    else {
        console.log("Condition not found, assuming AL");
        return false;
    }
}

const insGetComponents = (instruction) => {
    // MOVT R4, 0x3F20 -> R4, 0x3F20 -> R4,0x3F20
    let components = instruction.substring(instruction.indexOf(" ") + 1).trim().replace(" ", "");
    return components.split(",");
}

const getSubStringBin = (start, end, bin) => {
    // 1010 1010 1010 1010
    return bin.substring(start, end);
}

const identifyAndHandleInstructions = (instruction) => {
    switch (true) {
        case instruction.includes("MOVT"):
            return handle_MOV(instruction, "T");
        case instruction.includes("MOVW"):
            return handle_MOV(instruction, "W");
        case instruction.includes("AND"):
            return handle_DataProcessing(instruction, "0000");
        case instruction.includes("EOR"):
            return handle_DataProcessing(instruction, "0001");
        case instruction.includes("SUB"):
            return handle_DataProcessing(instruction, "0010");
        case instruction.includes("RSB"):
            return handle_DataProcessing(instruction, "0011");
        case instruction.includes("ADD"):
            return handle_DataProcessing(instruction, "0100");
        case instruction.includes("ADC"):
            return handle_DataProcessing(instruction, "0101");
        case instruction.includes("SBC"):
            return handle_DataProcessing(instruction, "0110");
        case instruction.includes("RSC"):
            return handle_DataProcessing(instruction, "0111");
        case instruction.includes("TST"):
            return handle_DataProcessing(instruction, "1000");
        case instruction.includes("TEQ"):
            return handle_DataProcessing(instruction, "1001");
        case instruction.includes("CMP"):
            return handle_DataProcessing(instruction, "1010");
        case instruction.includes("CMN"):
            return handle_DataProcessing(instruction, "1011");
        case instruction.includes("ORR"):
            return handle_DataProcessing(instruction, "1100");
        case instruction.includes("MOV"):
            return handle_DataProcessing(instruction, "1101");
        case instruction.includes("BIC"):
            return handle_DataProcessing(instruction, "1110");
        case instruction.includes("MVN"):
            return handle_DataProcessing(instruction, "1111");
        case instruction.includes("LDR"):
            return handle_SingleDataTransfer(instruction);
        case instruction.includes("STR"):
            return handle_SingleDataTransfer(instruction);
        case instruction.includes("BX"):
            return handle_BranchWithExchange(instruction)
        case instruction.includes("B"):
            return handle_Branch(instruction);
    }
    return "[ "+instruction+" ] not matched"

}


//////// Instruction Handlers
const handle_MOV = (instruction, movType) => {
    // MOVW R4, 0
    let components = insGetComponents(instruction); // [R4, 0]

    let condition = insGetConditionCode(instruction);
    let _27to24 = movType === "T" ? "00110100" : "00110000";
    let imm4 = getSubStringBin(0, 4, hexToBin(components[1], 16));
    let rd = getRegisterInBin(components[0]);
    let imm12 = getSubStringBin(4, 16, hexToBin(components[1], 16));

    return `${condition} ${_27to24} ${imm4} ${rd} ${imm12}`;
};

const handle_DataProcessing = (instruction, operationCode) => {

    let components = insGetComponents(instruction);
    
    let condition = insGetConditionCode(instruction);
    let _27to26 = "00";
    let i = components[2].includes("R") ? "0" : "1";
    let opCode = operationCode;
    let s = insGetSpecial(instruction).includes("s") ? "1" : "0";
    let Rn = getRegisterInBin(components[1]);
    let Rd = getRegisterInBin(components[0]); //                                1111 1111 1111 0110 0110 20
    let Operand2;
    if (i === "0") { Operand2 = getRegisterInBin(components[2]) }
    else { Operand2 = hexToBin(components[2], 12); }

    return `${condition} ${_27to26} ${i} ${opCode} ${s} ${Rn} ${Rd} ${Operand2}`;
};

const handle_SingleDataTransfer = (instruction) => {
    let components = insGetComponents(instruction);

    let cond = insGetConditionCode(instruction);
    let _27to26 = "01";
    let I = "0";
    let P = "0";
    let U = "0";
    let B = "0";
    let W = "0";
    let L = instruction.includes("LDR") ? "1" : "0";
    let Rn = getRegisterInBin(components[1]);
    let Rd = getRegisterInBin(components[0]);
    let Offset = "000000000000";

    return `${cond} ${_27to26} ${I} ${P} ${U} ${B} ${W} ${L} ${Rn} ${Rd} ${Offset}`;
};

const handle_BranchWithExchange = (instruction) => {
    let components = insGetComponents(instruction);

    let cond = insGetConditionCode(instruction);
    let _27to4 = "000100101111111111110001";
    let Rn = getRegisterInBin(components[0]);
    console.log("BX:rn:", components[0]);
    console.log("BX:rninBin:", Rn);

    return `${cond} ${_27to4} ${Rn}`;
}

const handle_Branch = (instruction) => {
    let components = insGetComponents(instruction);

    let cond = insGetConditionCode(instruction);
    let _27to25 = "101";
    let L = insGetSpecial(instruction).includes("l") ? "1" : "0";
    let offset = hexToBin(components[0], 24);

    return `${cond} ${_27to25} ${L} ${offset}`;
}



convertBtn.addEventListener("click", () => {
    let outputBin = "";
    let outputHex = "";
    let outputHexOneline = "";
    hexFileData = "";

    let instructions = getInstructions();
    instructions = cleanse2(instructions);
    instructions.forEach(instruction => {
        console.log("On Instruction:",instruction)
        let bin = identifyAndHandleInstructions(instruction);
        let hex = `${splitAndReverseHex(binToHex(bin.replaceAll(" ", "")))}`
        outputBin += `${bin}\n`;
        
        if (!hex.includes("N")) {
            hexFileData += `${hex} `;
            outputHex += `${hex}\n`;
            outputHexOneline += `${hex} `
        } else {
            outputHex += `== == == ==\n`;
            
        }
        binFileData += `${bin.replaceAll(" ", "")}`;
    });
    setText(txtOutputBin, outputBin);
    setText(txtOutputHex, outputHex.trim());
    setText(txtOutputHexOneline, outputHexOneline.trim());
});



downloadFileBtn.addEventListener("click", () => {
    test_two();

});


const test_one = () => {
    console.log("Downloading File...");
    let fileName = fileNameInput.value;
    let data = hexFileData.trim().toLowerCase().split(" ");
    console.log(data);

    let file = "";
    file += data.map(hex => String.fromCharCode(+("0x" + hex))).join("")
    console.log("E3 string.fromcharcode:", String.fromCharCode(+("0")));
    console.log(file)
    file = unescape(encodeURIComponent(file));
    console.log("reverse:", file.split("").map(ch => ("0"+ch.charCodeAt(0).toString(16).toUpperCase()).slice(-2)))
    
    let downloadLink = document.createElement("a");
    downloadLink.setAttribute('href', 'data:application/octet-stream;charset=ISO-8859-7, ' + encodeURIComponent(file.trim()));
    downloadLink.setAttribute('download', fileName);
    downloadLink.click();
}

const test_two = () => {
    let data = hexFileData.trim().toLowerCase().split(" ");
    let file = "";
    file += data.map(hex => String.fromCharCode(+("0x" + hex))).join("")

    let blob = new Blob([file], { type: 'application/base64'});
    let href = URL.createObjectURL(blob);
    let a = Object.assign(document.createElement("a"), {
        href,
        style: "display:none",
        download: fileNameInput.value
    });
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(href);
    a.remove();
}

const test_three = () => {
    console.log("DATA:", hexFileData);
    let data = hexFileData.trim().toLowerCase().split(" ");
    console.log("Split Data:", data);

    let file = "";
    data.forEach(value => {
        file += String.fromCharCode("0x" + value);
    });
    console.log("Finished file:", file);

    let finFile = file.replaceAll(" ", "");

    let blob = new Blob([finFile]);
    let href = URL.createObjectURL(blob);
    let a = Object.assign(document.createElement("a"), {
        href,
        style: "display:none",
        download: fileNameInput.value
    });
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(href);
    a.remove();
}

const test_four = () => {
    let data = ["E3\n", "20"];
    let file = "";
    data.forEach(value => {
        file += String.fromCharCode("0x" + value);
    });
    console.log("Finished file:", file);

    let finFile = file.replaceAll(" ", "");

    let blob = new Blob([finFile], { type: 'application/octet-stream' });
    let href = URL.createObjectURL(blob);
    let a = Object.assign(document.createElement("a"), {
        href,
        style: "display:none",
        download: fileNameInput.value
    });
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(href);
    a.remove();
}

const test_five = () => {
    let data = hexFileData.replaceAll("\n", "").replaceAll("00", "0");
    let file = "";
    let out = "";

    let fixedData = data.trim().toLowerCase().split(" ");

    let b = ""
    fixedData.forEach(value => {
        if (value === "0") { 
            b = String.fromCharCode(value);
            
        } else {
            b = String.fromCharCode("0x"+value);
        }
        file += b;
        out += `<${b}>\n`;
    });

    let blob = new Blob([file], { type: 'application/octet-stream' });
    let href = URL.createObjectURL(blob);
    let a = Object.assign(document.createElement("a"), {
        href,
        style: "display:none",
        download: fileNameInput.value
    });
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(href);
    a.remove();
    console.log(out);
}

const test_six = () => {

    var bytes = Array();
    
    let data = hexFileData.trim().toLowerCase().replaceAll(" ", "")

    data.forEach(value => {
        bytes.push(hexToDecimal(value));
        console.log(`>${hexToDecimal(value)}`)
    })


    var ia = new Uint8Array(bytes);
    var file = new File([ia], fileNameInput.value, { type: "application/octet-stream" });
    document.location = URL.createObjectURL(file);
    // let href = URL.createObjectURL(file);
    // let a = Object.assign(document.createElement("a"), {
    //     href,
    //     style: "display:none",
    //     download: fileNameInput.value
    // });
    // document.body.appendChild(a);
    // a.click();
    // URL.revokeObjectURL(href);
    // a.remove();
}


