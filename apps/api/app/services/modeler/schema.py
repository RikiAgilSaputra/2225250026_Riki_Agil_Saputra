"""Structured output contract for the modeler (docs/14 §5)."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class Variable(BaseModel):
    model_config = ConfigDict(extra="forbid")
    symbol: Literal["x", "y"]
    meaning: str = Field(description="Makna singkat, mis. 'harga 1 buku'")
    unit: str = Field(description="Satuan, mis. 'rupiah', 'tahun', 'ekor'")
    must_be_positive: bool
    must_be_integer: bool = Field(description="True untuk banyak benda/orang/hewan")


class Equation(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_text: str = Field(description="Kutipan PERSIS dari soal yang menjadi dasar persamaan ini")
    math_sentence: str = Field(description="Kalimat matematika, mis. '2 × harga buku + 3 × harga pensil = 19.000'")
    equation: str = Field(description="Notasi dengan x dan y dan * eksplisit, mis. '2*x + 3*y = 19000'")


class WordProblemModel(BaseModel):
    model_config = ConfigDict(extra="forbid")
    is_spldv: bool
    not_spldv_reason: str | None
    language_ok: bool = Field(description="False jika teks bukan soal matematika berbahasa Indonesia yang wajar")
    context_category: Literal["personal", "sosial_budaya", "pekerjaan", "saintifik", "geometri", "lainnya"]
    known_facts: list[str]
    irrelevant_facts: list[str]
    question_text: str
    variables: list[Variable]
    equations: list[Equation]
    target: str = Field(description="Ekspresi yang ditanya dalam x dan y, mis. 'x', 'x + y', '4*x + 2*y'")
    target_label: str = Field(description="Yang ditanya dalam kata-kata, mis. 'harga 1 buku'")
    target_unit: str
