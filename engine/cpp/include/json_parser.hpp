#pragma once

#include <string>
#include <vector>
#include <map>
#include <memory>
#include <sstream>
#include <cctype>
#include <stdexcept>
#include <iomanip>

namespace eco_json {

enum class Type {
    Null,
    Boolean,
    Number,
    String,
    Array,
    Object
};

class Value {
public:
    Type type;
    bool bool_val = false;
    double num_val = 0.0;
    std::string str_val;
    std::vector<Value> arr_val;
    std::map<std::string, Value> obj_val;

    Value() : type(Type::Null) {}
    Value(bool b) : type(Type::Boolean), bool_val(b) {}
    Value(int n) : type(Type::Number), num_val(static_cast<double>(n)) {}
    Value(double n) : type(Type::Number), num_val(n) {}
    Value(const char* s) : type(Type::String), str_val(s) {}
    Value(const std::string& s) : type(Type::String), str_val(s) {}
    Value(Type t) : type(t) {}

    bool is_null() const { return type == Type::Null; }
    bool is_bool() const { return type == Type::Boolean; }
    bool is_number() const { return type == Type::Number; }
    bool is_string() const { return type == Type::String; }
    bool is_array() const { return type == Type::Array; }
    bool is_object() const { return type == Type::Object; }

    bool as_bool(bool def = false) const { return is_bool() ? bool_val : def; }
    double as_double(double def = 0.0) const { return is_number() ? num_val : def; }
    int as_int(int def = 0) const { return is_number() ? static_cast<int>(num_val) : def; }
    std::string as_string(const std::string& def = "") const { return is_string() ? str_val : def; }

    bool contains(const std::string& key) const {
        return is_object() && obj_val.find(key) != obj_val.end();
    }

    const Value& operator[](const std::string& key) const {
        static Value null_val;
        if (!is_object()) return null_val;
        auto it = obj_val.find(key);
        if (it != obj_val.end()) return it->second;
        return null_val;
    }

    Value& operator[](const std::string& key) {
        if (!is_object()) {
            type = Type::Object;
            obj_val.clear();
        }
        return obj_val[key];
    }

    const Value& operator[](size_t idx) const {
        static Value null_val;
        if (!is_array() || idx >= arr_val.size()) return null_val;
        return arr_val[idx];
    }

    void push_back(const Value& val) {
        if (!is_array()) {
            type = Type::Array;
            arr_val.clear();
        }
        arr_val.push_back(val);
    }

    std::string serialize() const {
        std::ostringstream ss;
        switch (type) {
            case Type::Null:
                ss << "null";
                break;
            case Type::Boolean:
                ss << (bool_val ? "true" : "false");
                break;
            case Type::Number: {
                // If it's effectively an integer
                if (num_val == static_cast<double>(static_cast<long long>(num_val))) {
                    ss << static_cast<long long>(num_val);
                } else {
                    ss << std::fixed << std::setprecision(6) << num_val;
                    std::string s = ss.str();
                    while (s.size() > 1 && s.back() == '0') s.pop_back();
                    if (s.back() == '.') s.pop_back();
                    return s;
                }
                break;
            }
            case Type::String: {
                ss << "\"";
                for (char c : str_val) {
                    if (c == '"') ss << "\\\"";
                    else if (c == '\\') ss << "\\\\";
                    else if (c == '\b') ss << "\\b";
                    else if (c == '\f') ss << "\\f";
                    else if (c == '\n') ss << "\\n";
                    else if (c == '\r') ss << "\\r";
                    else if (c == '\t') ss << "\\t";
                    else ss << c;
                }
                ss << "\"";
                break;
            }
            case Type::Array: {
                ss << "[";
                for (size_t i = 0; i < arr_val.size(); i++) {
                    if (i > 0) ss << ",";
                    ss << arr_val[i].serialize();
                }
                ss << "]";
                break;
            }
            case Type::Object: {
                ss << "{";
                size_t count = 0;
                for (const auto& pair : obj_val) {
                    if (count > 0) ss << ",";
                    ss << "\"" << pair.first << "\":" << pair.second.serialize();
                    count++;
                }
                ss << "}";
                break;
            }
        }
        return ss.str();
    }
};

class Parser {
    const std::string& src;
    size_t pos;

    void skip_whitespace() {
        while (pos < src.size() && (std::isspace(src[pos]) || src[pos] == '\r' || src[pos] == '\n')) {
            pos++;
        }
    }

    char peek() {
        skip_whitespace();
        if (pos >= src.size()) return '\0';
        return src[pos];
    }

    char get() {
        skip_whitespace();
        if (pos >= src.size()) return '\0';
        return src[pos++];
    }

public:
    Parser(const std::string& s) : src(s), pos(0) {}

    Value parse() {
        skip_whitespace();
        char c = peek();
        if (c == '{') return parse_object();
        if (c == '[') return parse_array();
        if (c == '"') return parse_string();
        if (std::isdigit(c) || c == '-') return parse_number();
        if (c == 't' || c == 'f') return parse_bool();
        if (c == 'n') return parse_null();
        return Value();
    }

private:
    Value parse_object() {
        Value val(Type::Object);
        get(); // '{'
        skip_whitespace();
        if (peek() == '}') {
            get();
            return val;
        }

        while (pos < src.size()) {
            skip_whitespace();
            if (peek() != '"') break;
            Value key = parse_string();
            skip_whitespace();
            if (get() != ':') break;
            Value v = parse();
            val.obj_val[key.str_val] = v;
            skip_whitespace();
            char next = peek();
            if (next == ',') {
                get();
            } else if (next == '}') {
                get();
                break;
            } else {
                break;
            }
        }
        return val;
    }

    Value parse_array() {
        Value val(Type::Array);
        get(); // '['
        skip_whitespace();
        if (peek() == ']') {
            get();
            return val;
        }

        while (pos < src.size()) {
            val.arr_val.push_back(parse());
            skip_whitespace();
            char next = peek();
            if (next == ',') {
                get();
            } else if (next == ']') {
                get();
                break;
            } else {
                break;
            }
        }
        return val;
    }

    Value parse_string() {
        get(); // opening '"'
        std::string s;
        while (pos < src.size()) {
            char c = src[pos++];
            if (c == '"') {
                return Value(s);
            }
            if (c == '\\' && pos < src.size()) {
                char esc = src[pos++];
                if (esc == '"') s += '"';
                else if (esc == '\\') s += '\\';
                else if (esc == '/') s += '/';
                else if (esc == 'b') s += '\b';
                else if (esc == 'f') s += '\f';
                else if (esc == 'n') s += '\n';
                else if (esc == 'r') s += '\r';
                else if (esc == 't') s += '\t';
                else s += esc;
            } else {
                s += c;
            }
        }
        return Value(s);
    }

    Value parse_number() {
        size_t start = pos;
        if (src[pos] == '-') pos++;
        while (pos < src.size() && std::isdigit(src[pos])) pos++;
        if (pos < src.size() && src[pos] == '.') {
            pos++;
            while (pos < src.size() && std::isdigit(src[pos])) pos++;
        }
        if (pos < src.size() && (src[pos] == 'e' || src[pos] == 'E')) {
            pos++;
            if (pos < src.size() && (src[pos] == '+' || src[pos] == '-')) pos++;
            while (pos < src.size() && std::isdigit(src[pos])) pos++;
        }
        std::string num_str = src.substr(start, pos - start);
        double val = std::stod(num_str);
        return Value(val);
    }

    Value parse_bool() {
        if (src.substr(pos, 4) == "true") {
            pos += 4;
            return Value(true);
        }
        if (src.substr(pos, 5) == "false") {
            pos += 5;
            return Value(false);
        }
        return Value(false);
    }

    Value parse_null() {
        if (src.substr(pos, 4) == "null") {
            pos += 4;
        }
        return Value();
    }
};

inline Value parse(const std::string& json_text) {
    Parser p(json_text);
    return p.parse();
}

} // namespace eco_json
