function add_event(elem, name, f) {
        elem.addEventListener(name, f, {
            capture: false,
            once: false,
            passive: true
        });
    }

    function remove_event(elem, name, f) {
        elem.removeEventListener(name, f, false);
    }

function open_tab(url) {
        // TODO error handling
        chrome.tabs.create({
            url: chrome.runtime.getURL(url)
        });
    }

    function current_date() {
        return new Date().toISOString().replace(new RegExp("\\:", "g"), "_");
    }

    function download(filename, blob) {
        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(blob);

            // TODO error handling
            chrome.downloads.download({
                url: url,
                filename: filename,
                saveAs: true,
                conflictAction: "prompt"
            }, function () {
                URL.revokeObjectURL(url);
                resolve();
            });
        });
    }

    function str_to_blob(contents) {
        return new Blob([contents], { type: "application/json" });
    }

function send_message_raw(message) {
        return new Promise(function (resolve, reject) {
            chrome.runtime.sendMessage(null, message, null, function (x) {
                var error = chrome.runtime.lastError;

                if (error != null) {
                    reject(new Error(error.message));

                } else {
                    resolve(x);
                }
            });
        });
    }

let wasm;

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

let WASM_VECTOR_LEN = 0;

let cachedTextEncoder = new TextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory0;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1 };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) wasm.__wbindgen_export_2.get(dtor)(a, state.b);
            else state.a = a;
        }
    };
    real.original = state;
    return real;
}

let stack_pointer = 32;

function addBorrowedObject(obj) {
    if (stack_pointer == 1) throw new Error('out of js stack');
    heap[--stack_pointer] = obj;
    return stack_pointer;
}
function __wbg_adapter_22(arg0, arg1, arg2) {
    try {
        wasm.wasm_bindgen__convert__closures__invoke1_mut_ref__h3ce9c88eb1294225(arg0, arg1, addBorrowedObject(arg2));
    } finally {
        heap[stack_pointer++] = undefined;
    }
}

function __wbg_adapter_25(arg0, arg1, arg2) {
    try {
        wasm.wasm_bindgen__convert__closures__invoke1_mut_ref__h3ce9c88eb1294225(arg0, arg1, addBorrowedObject(arg2));
    } finally {
        heap[stack_pointer++] = undefined;
    }
}

function __wbg_adapter_28(arg0, arg1, arg2) {
    wasm.wasm_bindgen__convert__closures__invoke1_mut__h2f5c8597c05d45a7(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_31(arg0, arg1, arg2) {
    try {
        wasm.wasm_bindgen__convert__closures__invoke1_mut_ref__h3ce9c88eb1294225(arg0, arg1, addBorrowedObject(arg2));
    } finally {
        heap[stack_pointer++] = undefined;
    }
}

function getCachedStringFromWasm0(ptr, len) {
    if (ptr === 0) {
        return getObject(len);
    } else {
        return getStringFromWasm0(ptr, len);
    }
}

function handleError(f) {
    return function () {
        try {
            return f.apply(this, arguments);

        } catch (e) {
            wasm.__wbindgen_exn_store(addHeapObject(e));
        }
    };
}

async function load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {

        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

async function init(input) {
    if (typeof input === 'undefined') {
        input = import.meta.url.replace(/\.js$/, '_bg.wasm');
    }
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_sendmessageraw_06db037e50adb455 = function(arg0, arg1) {
        var v0 = getCachedStringFromWasm0(arg0, arg1);
        var ret = send_message_raw(v0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbg_lengthComputable_2c61578bb268d520 = function(arg0) {
        var ret = getObject(arg0).lengthComputable;
        return ret;
    };
    imports.wbg.__wbg_loaded_9ede721f174ee728 = function(arg0) {
        var ret = getObject(arg0).loaded;
        return ret;
    };
    imports.wbg.__wbg_total_b776f43ec6f6f675 = function(arg0) {
        var ret = getObject(arg0).total;
        return ret;
    };
    imports.wbg.__wbg_new0_210d1cef1e5ccdd4 = function() {
        var ret = new Date();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_toUTCString_26e6acb7f2c1fdfe = function(arg0) {
        var ret = getObject(arg0).toUTCString();
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        var ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_log_eb1108411ecc4a7f = function(arg0) {
        console.log(getObject(arg0));
    };
    imports.wbg.__wbg_new_1d56e97b8de3067f = function(arg0, arg1) {
        var v0 = getCachedStringFromWasm0(arg0, arg1);
        var ret = new Error(v0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_abort_1733ec5128436a70 = function(arg0) {
        getObject(arg0).abort();
    };
    imports.wbg.__wbindgen_cb_drop = function(arg0) {
        const obj = takeObject(arg0).original;
        if (obj.cnt-- == 1) {
            obj.a = 0;
            return true;
        }
        var ret = false;
        return ret;
    };
    imports.wbg.__wbg_result_e2e1f64de73e26ef = handleError(function(arg0) {
        var ret = getObject(arg0).result;
        return addHeapObject(ret);
    });
    imports.wbg.__wbg_error_2c804d051a54c86a = function(arg0) {
        var ret = getObject(arg0).error;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_new_59cb74e423758ede = function() {
        var ret = new Error();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_stack_558ba5917b466edd = function(arg0, arg1) {
        var ret = getObject(arg1).stack;
        var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbg_error_4bb6c2a97407129a = function(arg0, arg1) {
        var v0 = getCachedStringFromWasm0(arg0, arg1);
    if (arg0 !== 0) { wasm.__wbindgen_free(arg0, arg1); }
    console.error(v0);
};
imports.wbg.__wbg_document_c26d0f423c143e0c = function(arg0) {
    var ret = getObject(arg0).document;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};
imports.wbg.__wbg_createElement_44ab59c4ad367831 = handleError(function(arg0, arg1, arg2) {
    var v0 = getCachedStringFromWasm0(arg1, arg2);
    var ret = getObject(arg0).createElement(v0);
    return addHeapObject(ret);
});
imports.wbg.__wbg_appendChild_3d4ec7dbf3472d31 = handleError(function(arg0, arg1) {
    var ret = getObject(arg0).appendChild(getObject(arg1));
    return addHeapObject(ret);
});
imports.wbg.__wbg_cssRules_c038197f43832459 = handleError(function(arg0) {
    var ret = getObject(arg0).cssRules;
    return addHeapObject(ret);
});
imports.wbg.__wbg_length_7bca3575e2dfc21c = function(arg0) {
    var ret = getObject(arg0).length;
    return ret;
};
imports.wbg.__wbg_insertRule_c0373a211f90c126 = handleError(function(arg0, arg1, arg2, arg3) {
    var v0 = getCachedStringFromWasm0(arg1, arg2);
    var ret = getObject(arg0).insertRule(v0, arg3 >>> 0);
    return ret;
});
imports.wbg.__wbg_get_a860b9763db92fcd = function(arg0, arg1) {
    var ret = getObject(arg0)[arg1 >>> 0];
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};
imports.wbg.__wbg_style_8404af1e6ba2159c = function(arg0) {
    var ret = getObject(arg0).style;
    return addHeapObject(ret);
};
imports.wbg.__wbg_removeProperty_f4c93418b3e220cc = handleError(function(arg0, arg1, arg2, arg3) {
    var v0 = getCachedStringFromWasm0(arg2, arg3);
    var ret = getObject(arg1).removeProperty(v0);
    var ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len1;
    getInt32Memory0()[arg0 / 4 + 0] = ptr1;
});
imports.wbg.__wbg_getPropertyValue_2549bbdba4668962 = handleError(function(arg0, arg1, arg2, arg3) {
    var v0 = getCachedStringFromWasm0(arg2, arg3);
    var ret = getObject(arg1).getPropertyValue(v0);
    var ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len1 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len1;
    getInt32Memory0()[arg0 / 4 + 0] = ptr1;
});
imports.wbg.__wbg_settype_28c925707f3cdada = function(arg0, arg1, arg2) {
    var v0 = getCachedStringFromWasm0(arg1, arg2);
    getObject(arg0).type = v0;
};
imports.wbg.__wbg_head_2b6d3d5b03819f20 = function(arg0) {
    var ret = getObject(arg0).head;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};
imports.wbg.__wbg_sheet_d24ec2bd414e40ea = function(arg0) {
    var ret = getObject(arg0).sheet;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};
imports.wbg.__wbg_self_c0d3a5923e013647 = handleError(function() {
    var ret = self.self;
    return addHeapObject(ret);
});
imports.wbg.__wbg_window_7ee6c8be3432927d = handleError(function() {
    var ret = window.window;
    return addHeapObject(ret);
});
imports.wbg.__wbg_globalThis_c6de1d938e089cf0 = handleError(function() {
    var ret = globalThis.globalThis;
    return addHeapObject(ret);
});
imports.wbg.__wbg_global_c9a01ce4680907f8 = handleError(function() {
    var ret = global.global;
    return addHeapObject(ret);
});
imports.wbg.__wbindgen_is_undefined = function(arg0) {
    var ret = getObject(arg0) === undefined;
    return ret;
};
imports.wbg.__wbg_newnoargs_8aad4a6554f38345 = function(arg0, arg1) {
    var v0 = getCachedStringFromWasm0(arg0, arg1);
    var ret = new Function(v0);
    return addHeapObject(ret);
};
imports.wbg.__wbg_call_1f85aaa5836dfb23 = handleError(function(arg0, arg1) {
    var ret = getObject(arg0).call(getObject(arg1));
    return addHeapObject(ret);
});
imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
    var ret = debugString(getObject(arg1));
    var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};
imports.wbg.__wbg_performance_781c00e4226de6c4 = function(arg0) {
    var ret = getObject(arg0).performance;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};
imports.wbg.__wbg_now_43100dbb52857cc6 = function(arg0) {
    var ret = getObject(arg0).now();
    return ret;
};
imports.wbg.__wbg_strtoblob_7a5bf7a4d3ec3d5e = function(arg0, arg1) {
    var v0 = getCachedStringFromWasm0(arg0, arg1);
    var ret = str_to_blob(v0);
    return addHeapObject(ret);
};
imports.wbg.__wbg_currentdate_37f91e30b34db27d = function(arg0) {
    var ret = current_date();
    var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};
imports.wbg.__wbg_download_d6b3f624d35cbd2b = function(arg0, arg1, arg2) {
    var v0 = getCachedStringFromWasm0(arg0, arg1);
    var ret = download(v0, getObject(arg2));
    return addHeapObject(ret);
};
imports.wbg.__wbg_files_ba0a9349d455282a = function(arg0) {
    var ret = getObject(arg0).files;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};
imports.wbg.__wbg_length_3f24ae61c187b7a5 = function(arg0) {
    var ret = getObject(arg0).length;
    return ret;
};
imports.wbg.__wbg_get_dc36ff74f8d08bac = function(arg0, arg1) {
    var ret = getObject(arg0)[arg1 >>> 0];
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};
imports.wbg.__wbg_setvalue_eb5415236467cd34 = function(arg0, arg1, arg2) {
    var v0 = getCachedStringFromWasm0(arg1, arg2);
    getObject(arg0).value = v0;
};
imports.wbg.__wbg_new_312f994f6231f9a3 = handleError(function() {
    var ret = new FileReader();
    return addHeapObject(ret);
});
imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
    var ret = getObject(arg0);
    return addHeapObject(ret);
};
imports.wbg.__wbg_setonprogress_065f81b2fa4e8a24 = function(arg0, arg1) {
    getObject(arg0).onprogress = getObject(arg1);
};
imports.wbg.__wbg_setonabort_9a4e5c4520d6d202 = function(arg0, arg1) {
    getObject(arg0).onabort = getObject(arg1);
};
imports.wbg.__wbg_setonerror_8cfc44442f6555a6 = function(arg0, arg1) {
    getObject(arg0).onerror = getObject(arg1);
};
imports.wbg.__wbg_setonload_324877de416175c3 = function(arg0, arg1) {
    getObject(arg0).onload = getObject(arg1);
};
imports.wbg.__wbg_readAsText_69e3d4932257ecdb = handleError(function(arg0, arg1) {
    getObject(arg0).readAsText(getObject(arg1));
});
imports.wbg.__wbg_body_be181e812b4c9a18 = function(arg0) {
    var ret = getObject(arg0).body;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};
imports.wbg.__wbg_instanceof_HtmlElement_8306a9fea71295d9 = function(arg0) {
    var ret = getObject(arg0) instanceof HTMLElement;
    return ret;
};
imports.wbg.__wbg_style_a1939f108963de8c = function(arg0) {
    var ret = getObject(arg0).style;
    return addHeapObject(ret);
};
imports.wbg.__wbg_settextContent_917f10f51a06bd14 = function(arg0, arg1, arg2) {
    var v0 = getCachedStringFromWasm0(arg1, arg2);
    getObject(arg0).textContent = v0;
};
imports.wbg.__wbg_instanceof_HtmlInputElement_9e9349535b986dc4 = function(arg0) {
    var ret = getObject(arg0) instanceof HTMLInputElement;
    return ret;
};
imports.wbg.__wbg_setAttribute_1e9980589f904db6 = handleError(function(arg0, arg1, arg2, arg3, arg4) {
    var v0 = getCachedStringFromWasm0(arg1, arg2);
    var v1 = getCachedStringFromWasm0(arg3, arg4);
    getObject(arg0).setAttribute(v0, v1);
});
imports.wbg.__wbg_addevent_e95b1b8bc347987d = function(arg0, arg1, arg2, arg3) {
    var v0 = getCachedStringFromWasm0(arg1, arg2);
    add_event(getObject(arg0), v0, getObject(arg3));
};
imports.wbg.__wbg_classList_26cad35d60a907de = function(arg0) {
    var ret = getObject(arg0).classList;
    return addHeapObject(ret);
};
imports.wbg.__wbg_add_e43d8149de92004a = handleError(function(arg0, arg1, arg2) {
    var v0 = getCachedStringFromWasm0(arg1, arg2);
    getObject(arg0).add(v0);
});
imports.wbg.__wbg_opentab_10c716a31bba302a = function(arg0, arg1) {
    var v0 = getCachedStringFromWasm0(arg0, arg1);
    open_tab(v0);
};
imports.wbg.__wbg_confirm_86365e903f6e23e3 = handleError(function(arg0, arg1, arg2) {
    var v0 = getCachedStringFromWasm0(arg1, arg2);
    var ret = getObject(arg0).confirm(v0);
    return ret;
});
imports.wbg.__wbg_getElementById_df597d226f179219 = function(arg0, arg1, arg2) {
    var v0 = getCachedStringFromWasm0(arg1, arg2);
    var ret = getObject(arg0).getElementById(v0);
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};
imports.wbg.__wbg_click_3b9a7794e3ac6e30 = function(arg0) {
    getObject(arg0).click();
};
imports.wbg.__wbindgen_cb_forget = function(arg0) {
    takeObject(arg0);
};
imports.wbg.__wbg_removeevent_d85987e3524619e6 = function(arg0, arg1, arg2, arg3) {
    var v0 = getCachedStringFromWasm0(arg1, arg2);
    remove_event(getObject(arg0), v0, getObject(arg3));
};
imports.wbg.__wbindgen_string_get = function(arg0, arg1) {
    const obj = getObject(arg1);
    var ret = typeof(obj) === 'string' ? obj : undefined;
    var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};
imports.wbg.__wbindgen_throw = function(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};
imports.wbg.__wbindgen_rethrow = function(arg0) {
    throw takeObject(arg0);
};
imports.wbg.__wbg_then_8c23dce80c84c8fb = function(arg0, arg1) {
    var ret = getObject(arg0).then(getObject(arg1));
    return addHeapObject(ret);
};
imports.wbg.__wbg_then_300153bb889a5b4b = function(arg0, arg1, arg2) {
    var ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
    return addHeapObject(ret);
};
imports.wbg.__wbg_resolve_708df7651c8929b8 = function(arg0) {
    var ret = Promise.resolve(getObject(arg0));
    return addHeapObject(ret);
};
imports.wbg.__wbg_setProperty_74426e9bb01e1cae = handleError(function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    var v0 = getCachedStringFromWasm0(arg1, arg2);
    var v1 = getCachedStringFromWasm0(arg3, arg4);
    var v2 = getCachedStringFromWasm0(arg5, arg6);
    getObject(arg0).setProperty(v0, v1, v2);
});
imports.wbg.__wbg_instanceof_Window_17fdb5cd280d476d = function(arg0) {
    var ret = getObject(arg0) instanceof Window;
    return ret;
};
imports.wbg.__wbindgen_closure_wrapper800 = function(arg0, arg1, arg2) {
    var ret = makeMutClosure(arg0, arg1, 33, __wbg_adapter_31);
    return addHeapObject(ret);
};
imports.wbg.__wbindgen_closure_wrapper810 = function(arg0, arg1, arg2) {
    var ret = makeMutClosure(arg0, arg1, 33, __wbg_adapter_25);
    return addHeapObject(ret);
};
imports.wbg.__wbindgen_closure_wrapper801 = function(arg0, arg1, arg2) {
    var ret = makeMutClosure(arg0, arg1, 33, __wbg_adapter_22);
    return addHeapObject(ret);
};
imports.wbg.__wbindgen_closure_wrapper926 = function(arg0, arg1, arg2) {
    var ret = makeMutClosure(arg0, arg1, 33, __wbg_adapter_28);
    return addHeapObject(ret);
};

if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
    input = fetch(input);
}

const { instance, module } = await load(await input, imports);

wasm = instance.exports;
init.__wbindgen_wasm_module = module;
wasm.__wbindgen_start();
return wasm;
}

init(new URL('assets/popup-f7f293ad.wasm', import.meta.url).href).catch(console.error);
//# sourceMappingURL=popup.js.map
