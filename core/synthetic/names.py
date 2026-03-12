"""
PT-BR name lists for synthetic student generation.

Provides around 100 first names and 80 last names drawn from common
Brazilian Portuguese names so that generated data looks realistic.
"""

FIRST_NAMES = [
    "Ana", "Amanda", "Adriana", "Beatriz", "Brenda", "Bianca",
    "Carla", "Camila", "Carolina", "Claudia",
    "Daniela", "Débora", "Diana",
    "Elisa", "Emanuela", "Eduarda",
    "Fernanda", "Flavia", "Gabriela", "Giovanna", "Graziela",
    "Helena", "Hellen", "Ingrid", "Isabela",
    "Juliana", "Jessica", "Karina", "Kamila", "Karen",
    "Larissa", "Leticia", "Luana",
    "Mariana", "Marina", "Melissa", "Monica",
    "Natalia", "Noemia",
    "Olivia", "Patricia", "Paula", "Priscila",
    "Queila", "Renata", "Roberta", "Sabrina",
    "Sandra", "Simone", "Stefania",
    "Tatiane", "Thais", "Valentina",
    "Vanessa", "Viviane", "Wanda",
    "Yasmin", "Zenaide",
    # Male
    "Alexandro", "Bruno", "Bernardo",
    "Carlos", "César", "Danilo", "Diego",
    "Eduardo", "Enzo", "Felipe", "Francisco",
    "Gabriel", "Guilherme", "Gustavo",
    "Henrique", "Horácio",
    "Igor", "Ivan", "João", "Junio",
    "Kevin", "Leonardo", "Lucas", "Luis",
    "Marcos", "Matheus", "Nathan", "Nicolas",
    "Octavio", "Otávio", "Oswaldo",
    "Pedro", "Paulo", "Quirino",
    "Rafael", "Rodrigo",
    "Sergio", "Tiago", "Thiago",
    "Ulisses", "Umberto",
    "Victor", "Vinícius", "Vitor",
    "Wallace", "Willian", "Xavier",
    "Yuri",
]

LAST_NAMES = [
    "Silva", "Santos", "Souza", "Oliveira", "Pereira",
    "Costa", "Ferreira", "Alves", "Lima", "Rocha",
    "Martins", "Carvalho", "Melo", "Ribeiro", "Araújo",
    "Nascimento", "Gomes", "Rodrigues", "Campos", "Cardoso",
    "Barbosa", "Moraes", "Cavalcanti", "Dias", "Machado",
    "Monteiro", "Andrade", "Moreira", "Freitas", "Nunes",
    "Medeiros", "Mendes", "Teixeira", "Marques", "Lopes",
    "Azevedo", "Correia", "Miranda", "Santana", "Ramos",
    "Castro", "Viana", "Xavier", "Batista", "Cunha",
    "Figueiredo", "Pinto", "Guimarães", "Cruz", "Fernandes",
    "Pires", "Soares", "Vieira", "Borges", "Tavares",
    "Braga", "Fonseca", "Reis", "Nogueira", "Coelho",
    "Leite", "Neves", "Assis", "Queiroz", "Lacerda",
    "Magalhães", "Brito", "Mota", "Silveira", "Amaral",
    "Siqueira", "Rezende", "Duarte", "Sampaio",
    "Barros", "Fogaça", "Paiva", "Matos", "Roriz",
]


def generate_name(rng):
    """Return a random PT-BR full name (First + Last1 + Last2)."""
    first = rng.choice(FIRST_NAMES)
    last1 = rng.choice(LAST_NAMES)
    last2 = rng.choice(LAST_NAMES)
    # Ensure the two last names differ
    attempts = 0
    while last2 == last1 and attempts < 10:
        last2 = rng.choice(LAST_NAMES)
        attempts += 1
    return f"{first} {last1} {last2}"
