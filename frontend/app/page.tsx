"use client";

import React, { useState, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const darkBg = "#18181c";
const darkCard = "#23232c";
const accent = "#1f6feb";
const textColor = "#fafbfd";
const secondaryText = "#a7adc0";
const axisColor = "#69697b";

type SignalData = Array<{ index: number; value: number }>;

export default function SignalAnalyzerDashboard() {
  const [rawSignal, setRawSignal] = useState<SignalData | null>(null);
  const [filteredSignal, setFilteredSignal] = useState<SignalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Parse CSV file and set rawSignal
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | File, skipAnalyze = false) => {
    setError(null);
    let file: File | undefined;
    if (e instanceof File) {
      file = e;
    } else {
      file = e.target.files?.[0];
    }
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.trim().split("\n");
        // simple CSV parser for 'signal' column
        const header = lines[0].toLowerCase().replace("\r", "");
        if (!header.includes("signal")) {
          setError("CSV dosyasında 'signal' sütunu yok.");
          setRawSignal(null);
          return;
        }
        const data = lines
          .slice(1)
          .map((line, idx) => {
            const n = parseFloat(line.replace("\r", ""));
            return { index: idx, value: n };
          })
          .filter((d) => !isNaN(d.value));
        setRawSignal(data);
        setFilteredSignal(null);

        // Eğer skipAnalyze false ise örnek veri sonrası analiz de yapılsın
        if (!skipAnalyze) {
          // setTimeout, setRawSignal'ın state güncellemesini bekleyip analiz etmek için (garantili)
          setTimeout(() => {
            handleAnalyze(file);
          }, 0);
        }
      } catch (err) {
        setError("Dosya okunurken hata oluştu.");
      }
    };
    reader.readAsText(file);
  };

  // Analyze with AI - Backend'e sinyali gönder, filtreli dön
  // file parametresi ile çağrıldığında o dosyayı kullanır, yoksa input'tan seçili
  const handleAnalyze = async (overrideFile?: File) => {
    setError(null);
    setLoading(true);
    setFilteredSignal(null);

    let file: File | undefined;
    if (overrideFile) {
      file = overrideFile;
    } else if (fileInput.current && fileInput.current.files?.[0]) {
      file = fileInput.current.files[0];
    }

    if (!file) {
      setError("Lütfen önce bir dosya yükleyin.");
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const url = "http://localhost:8000/analyze_signal";
      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });
      let data: any;
      try {
        data = await res.json();
      } catch (err) {
        setError("Beklenmeyen yanıt formatı (JSON parse hatası).");
        setLoading(false); // Reset loading even on JSON error
        return;
      }
      console.log("Backend response:", data);

      if (!res.ok) {
        setError(
          (typeof data === "object" && data?.error)
            ? data.error
            : `Sunucudan hata: ${res.status} ${res.statusText}`
        );
        setFilteredSignal(null); // Make sure not to show old results on error
        setLoading(false);
        return;
      }
      if (!data.filtered_signal || !Array.isArray(data.filtered_signal)) {
        setError("Beklenmeyen API cevabı.");
        setFilteredSignal(null);
        setLoading(false);
        return;
      }
      // backend returns filtered_signal as array
      const filtered = data.filtered_signal.map(
        (v: number, idx: number) => ({
          index: idx,
          value: v,
        })
      );
      setFilteredSignal(filtered); // <- This ensures the chart gets the result
      setLoading(false); // Make sure to set loading to false after success
    } catch (e: any) {
      setError("Sunucuya erişilemedi veya ağ hatası oluştu.");
      setFilteredSignal(null);
      setLoading(false); // Ensure loading resets also on network/API errors
    }
  };

  // Try with sample data button - generates CSV, uploads as file ve AI analizini otomatik tetikler
  const handleTryWithSampleData = () => {
    // 50 satırlık sinüs dalgası ve rasgele noise
    const N = 50;
    const freq = 2; // Hz
    const fs = 25; // Hz örnekleme
    let csv = "signal\n";
    const values: number[] = [];
    for (let i = 0; i < N; i++) {
      const t = i / fs;
      const value = Math.sin(2 * Math.PI * freq * t) + 0.2 * (Math.random() - 0.5);
      values.push(value);
      csv += value.toFixed(6) + "\n";
    }
    const file = new File([csv], "ornek_sinyal.csv", { type: "text/csv" });
    setRawSignal(values.map((v, idx) => ({ index: idx, value: v })));
    setFilteredSignal(null);
    setFilename(file.name);

    // Hem dosyayı yükle hem analiz fonksiyonu tetikle
    handleFileUpload(file); // handleFileUpload file ile çağrılınca analyze'ı da tetikler
  };

  // Dark mode root style
  React.useEffect(() => {
    document.body.style.background = darkBg;
    document.body.style.color = textColor;
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: darkBg,
        color: textColor,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,"Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: 750,
          margin: "32px auto",
          background: darkCard,
          borderRadius: "18px",
          padding: "38px 38px 50px 38px",
          boxShadow: "0 4px 16px #19193272",
        }}
      >
        <h1
          style={{
            fontSize: "2.3rem",
            fontWeight: 700,
            marginBottom: 8,
            color: accent,
            letterSpacing: "-0.04em",
          }}
        >
          Signal Analyzer Dashboard
        </h1>
        <p style={{ color: secondaryText, marginBottom: 35, fontSize: "1.08rem" }}>
          Sinyal dosyanızı yükleyin, <b>AI ile analiz</b> edin ve sinyallerinizi filtreli/düzenli olarak görselleştirin.
        </p>
        <div style={{ display: "flex", gap: 14, marginBottom: 12 }}>
          <label
            style={{
              background: accent,
              color: "#fff",
              fontWeight: 500,
              padding: "12px 28px",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: "1rem",
              display: "inline-block",
            }}
          >
            Dosya Yükle (CSV)
            <input
              type="file"
              accept=".csv"
              ref={fileInput}
              onChange={(e) => handleFileUpload(e, true)}
              style={{ display: "none" }}
            />
          </label>
          <button
            onClick={handleTryWithSampleData}
            disabled={loading}
            style={{
              background: "#fff",
              color: "#07ab4a",
              border: "2px solid #07ab4a",
              fontWeight: 600,
              padding: "12px 24px",
              borderRadius: 10,
              cursor: loading ? "not-allowed" : "pointer",
              fontSize: "1rem",
              boxShadow: "0 2px 6px #07ab4a31",
              transition: "background 0.2s, color 0.2s",
              minWidth: 175,
            }}
          >
            {"Örnek Veriyle Dene"}
          </button>
        </div>
        {filename && (
          <span
            style={{
              marginLeft: 6,
              color: secondaryText,
              fontSize: "0.98rem",
              verticalAlign: "middle",
              display: "inline-block"
            }}
          >
            {filename}
          </span>
        )}
        <br />
        <button
          onClick={() => handleAnalyze()}
          disabled={!rawSignal || loading}
          style={{
            background: loading ? "#55597a" : accent,
            color: "#fff",
            fontWeight: 600,
            border: "none",
            borderRadius: 8,
            padding: "12px 30px",
            fontSize: "1.09rem",
            marginTop: 22,
            cursor: !rawSignal || loading ? "not-allowed" : "pointer",
            transition: "background 0.2s",
            boxShadow: loading ? "none" : "0 2px 10px #1944c380",
          }}
        >
          {loading ? "Analiz Ediliyor..." : "Analyze with AI"}
        </button>
        {error && (
          <div
            style={{
              marginTop: 15,
              background: "#341d1d",
              color: "#e98282",
              padding: "10px 20px",
              borderRadius: 8,
              fontSize: "1.03rem",
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}
        {(rawSignal || filteredSignal) && (
          <div style={{ marginTop: 44 }}>
            <h3 style={{ color: "#f5f7fc", fontWeight: 600, fontSize: "1.28rem" }}>
              Sinyal Grafiği
            </h3>
            <div
              style={{
                width: "100%",
                height: 360,
                background: "#171822",
                borderRadius: 13,
                marginTop: 10,
                boxShadow: "0 2px 16px #1a1a277a",
                padding: "13px 10px 0 0",
              }}
            >
              <ResponsiveContainer width="100%" height="92%">
                <LineChart>
                  <CartesianGrid stroke="#303046" strokeDasharray="3 6" />
                  <XAxis
                    dataKey="index"
                    tick={{ fill: axisColor, fontSize: "0.93rem" }}
                    tickLine={{ stroke: axisColor }}
                    axisLine={{ stroke: axisColor }}
                    label={{
                      value: "Zaman (örnek indexi)",
                      position: "insideBottom",
                      offset: -8,
                      fill: secondaryText,
                    }}
                  />
                  <YAxis
                    tick={{ fill: axisColor, fontSize: "0.93rem" }}
                    domain={["dataMin-0.2", "dataMax+0.2"]}
                    axisLine={{ stroke: axisColor }}
                    tickLine={{ stroke: axisColor }}
                    label={{
                      value: "Sinyal",
                      angle: -90,
                      position: "insideLeft",
                      fill: secondaryText,
                      offset: 10,
                    }}
                  />
                  <Tooltip
                    contentStyle={{ background: "#1f2232", border: "none", borderRadius: 10 }}
                    labelStyle={{ color: accent }}
                  />
                  <Legend
                    verticalAlign="top"
                    iconSize={14}
                    wrapperStyle={{ color: secondaryText, marginBottom: -2, marginLeft: 4 }}
                  />
                  {rawSignal && (
                    <Line
                      type="monotone"
                      data={rawSignal}
                      dataKey="value"
                      name="Ham Sinyal"
                      stroke="#e3d26f"
                      strokeWidth={2.2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                  {filteredSignal && (
                    <Line
                      type="monotone"
                      data={filteredSignal}
                      dataKey="value"
                      name="Filtreli Sinyal"
                      stroke="#39c9ff"
                      strokeWidth={2.4}
                      dot={false}
                      isAnimationActive={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
            {filteredSignal && (
              <p style={{ marginTop: 20, color: secondaryText, fontSize: "0.97rem" }}>
                <b>Filtreli sinyal</b> <span style={{ color: "#39c9ff" }}>AI ile analiz edildi ve filtrelendi.</span>
              </p>
            )}
          </div>
        )}
      </div>
      <div style={{ textAlign: "center", marginTop: 22, color: "#4a4a5b", fontSize: "0.97rem" }}>
        &copy; {new Date().getFullYear()} Signal Analyzer Dashboard | <span style={{color:accent}}>Koyu Tema</span>
      </div>
    </div>
  );
}
